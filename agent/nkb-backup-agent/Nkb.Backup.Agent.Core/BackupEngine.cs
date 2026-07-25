using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Nkb.Backup.Agent.Contracts;

namespace Nkb.Backup.Agent.Core
{
    public class BackupProgressTracker
    {
        public int ChunkIndex { get; set; } = 0;
        public long TotalBytesRead { get; set; } = 0;
        public long TotalBytesWritten { get; set; } = 0;
        public long FilesProcessed { get; set; } = 0;
    }

    public class BackupEngine
    {
        private const int ChunkSizeBytes = 4 * 1024 * 1024; // 4MB chunks

        public static string ComputeSha256(byte[] data)
        {
            using var sha = SHA256.Create();
            byte[] hash = sha.ComputeHash(data);
            return Convert.ToHexString(hash).ToLowerInvariant();
        }

        public static string ComputeFileSha256(string filePath)
        {
            using var sha = SHA256.Create();
            using var stream = File.OpenRead(filePath);
            byte[] hash = sha.ComputeHash(stream);
            return Convert.ToHexString(hash).ToLowerInvariant();
        }

        /// <summary>
        /// Encrypt a chunk using AES-256-GCM with a unique 96-bit random nonce (Mandatory Correction #13)
        /// </summary>
        public static (byte[] Ciphertext, byte[] Nonce, byte[] Tag) EncryptChunkAESGCM(byte[] plainData, byte[] dekKey)
        {
            byte[] nonce = new byte[12]; // 96-bit random nonce
            RandomNumberGenerator.Fill(nonce);

            byte[] ciphertext = new byte[plainData.Length];
            byte[] tag = new byte[16]; // 128-bit authentication tag

            using var aesGcm = new AesGcm(dekKey, 16);
            aesGcm.Encrypt(nonce, plainData, ciphertext, tag);

            return (ciphertext, nonce, tag);
        }

        /// <summary>
        /// Decrypt AES-256-GCM chunk
        /// </summary>
        public static byte[] DecryptChunkAESGCM(byte[] ciphertext, byte[] dekKey, byte[] nonce, byte[] tag)
        {
            byte[] plaintext = new byte[ciphertext.Length];
            using var aesGcm = new AesGcm(dekKey, 16);
            aesGcm.Decrypt(nonce, ciphertext, tag, plaintext);
            return plaintext;
        }

        /// <summary>
        /// Execute FileBackupProvider Backup Run (Phase 1 Scope)
        /// </summary>
        public async Task<bool> ExecuteFileBackupJobAsync(
            string jobCode,
            string targetRepositoryPath,
            string[] sourcePaths,
            byte[] dekKey,
            Func<JobProgressPayload, Task> onProgressReport,
            CancellationToken ct)
        {
            string stagingDir = Path.Combine(targetRepositoryPath, ".staging_" + jobCode);
            string finalDir = Path.Combine(targetRepositoryPath, jobCode);

            try
            {
                if (Directory.Exists(stagingDir))
                    Directory.Delete(stagingDir, true);

                Directory.CreateDirectory(stagingDir);
                string chunksDir = Path.Combine(stagingDir, "chunks");
                Directory.CreateDirectory(chunksDir);

                long totalBytesScanned = 0;
                var tracker = new BackupProgressTracker();

                foreach (var srcPath in sourcePaths)
                {
                    if (ct.IsCancellationRequested) break;

                    if (File.Exists(srcPath))
                    {
                        var fi = new FileInfo(srcPath);
                        totalBytesScanned += fi.Length;
                        await ProcessSingleFile(fi, chunksDir, dekKey, tracker, ct);
                    }
                    else if (Directory.Exists(srcPath))
                    {
                        var dirInfo = new DirectoryInfo(srcPath);
                        // Prevent recursive symlink / junction loop (Mandatory Correction #10)
                        foreach (var file in dirInfo.EnumerateFiles("*", SearchOption.AllDirectories))
                        {
                            if (ct.IsCancellationRequested) break;
                            if ((file.Attributes & FileAttributes.ReparsePoint) == FileAttributes.ReparsePoint) continue; // Skip junctions

                            totalBytesScanned += file.Length;
                            await ProcessSingleFile(file, chunksDir, dekKey, tracker, ct);
                        }
                    }
                }

                // Write manifest.json & atomic completion marker .completed (Mandatory Correction #8)
                var manifestObj = new
                {
                    JobCode = jobCode,
                    Timestamp = DateTime.UtcNow.ToString("o"),
                    Provider = "FileBackupProvider",
                    ProviderVersion = "1.0.0",
                    TotalSize = tracker.TotalBytesRead,
                    StoredSize = tracker.TotalBytesWritten,
                    FilesCount = tracker.FilesProcessed,
                    ChunksCount = tracker.ChunkIndex,
                    EncryptionAlgo = "AES-256-GCM",
                    DekKeyRef = "KEK-V1"
                };

                string manifestJson = JsonSerializer.Serialize(manifestObj, new JsonSerializerOptions { WriteIndented = true });
                await File.WriteAllTextAsync(Path.Combine(stagingDir, "manifest.json"), manifestJson, ct);
                await File.WriteAllTextAsync(Path.Combine(stagingDir, ".completed"), DateTime.UtcNow.ToString("o"), ct);

                // Atomic move from staging to final directory
                if (Directory.Exists(finalDir))
                    Directory.Delete(finalDir, true);

                Directory.Move(stagingDir, finalDir);

                await onProgressReport(new JobProgressPayload
                {
                    State = "completed",
                    ProgressPercent = 100,
                    BytesScanned = totalBytesScanned,
                    BytesRead = tracker.TotalBytesRead,
                    BytesTransferred = tracker.TotalBytesWritten,
                    FilesProcessed = tracker.FilesProcessed
                });

                return true;
            }
            catch (Exception ex)
            {
                if (Directory.Exists(stagingDir))
                {
                    try { Directory.Delete(stagingDir, true); } catch { }
                }

                await onProgressReport(new JobProgressPayload
                {
                    State = "failed",
                    ErrorMessage = ex.Message
                });

                return false;
            }
        }

        private async Task ProcessSingleFile(
            FileInfo file, 
            string chunksDir, 
            byte[] dekKey, 
            BackupProgressTracker tracker,
            CancellationToken ct)
        {
            using var fs = file.Open(FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
            byte[] buffer = new byte[ChunkSizeBytes];
            int bytesRead;

            while ((bytesRead = await fs.ReadAsync(buffer, 0, buffer.Length, ct)) > 0)
            {
                byte[] chunkData = new byte[bytesRead];
                Array.Copy(buffer, chunkData, bytesRead);

                var (ciphertext, nonce, tag) = EncryptChunkAESGCM(chunkData, dekKey);

                string chunkFileName = $"chunk_{tracker.ChunkIndex:D6}.dat";
                string chunkPath = Path.Combine(chunksDir, chunkFileName);

                using (var chunkFile = File.Create(chunkPath))
                {
                    chunkFile.Write(nonce, 0, nonce.Length);
                    chunkFile.Write(tag, 0, tag.Length);
                    chunkFile.Write(ciphertext, 0, ciphertext.Length);
                }

                tracker.ChunkIndex++;
                tracker.TotalBytesRead += bytesRead;
                tracker.TotalBytesWritten += (nonce.Length + tag.Length + ciphertext.Length);
            }

            tracker.FilesProcessed++;
        }
    }
}
