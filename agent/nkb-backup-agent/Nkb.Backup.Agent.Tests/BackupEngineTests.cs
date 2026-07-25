using System.IO;
using System.Text;
using System.Threading.Tasks;
using Nkb.Backup.Agent.Core;
using Xunit;

namespace Nkb.Backup.Agent.Tests
{
    public class BackupEngineTests
    {
        [Fact]
        public void TestAES256GCMEncryptionDecryption()
        {
            byte[] dekKey = new byte[32];
            for (int i = 0; i < 32; i++) dekKey[i] = (byte)i;

            byte[] originalData = Encoding.UTF8.GetBytes("NKB_CONFIDENTIAL_PAYLOAD_TEST_123");

            var (ciphertext, nonce, tag) = BackupEngine.EncryptChunkAESGCM(originalData, dekKey);

            Assert.NotNull(ciphertext);
            Assert.Equal(12, nonce.Length);
            Assert.Equal(16, tag.Length);

            byte[] decryptedData = BackupEngine.DecryptChunkAESGCM(ciphertext, dekKey, nonce, tag);
            string decryptedStr = Encoding.UTF8.GetString(decryptedData);

            Assert.Equal("NKB_CONFIDENTIAL_PAYLOAD_TEST_123", decryptedStr);
        }

        [Fact]
        public void TestSHA256Computation()
        {
            byte[] data = Encoding.UTF8.GetBytes("hello_nkb");
            string hash = BackupEngine.ComputeSha256(data);

            Assert.NotNull(hash);
            Assert.Equal(64, hash.Length);
        }
    }
}
