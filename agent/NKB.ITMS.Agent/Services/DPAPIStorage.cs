using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using NKB.ITMS.Agent.Config;

namespace NKB.ITMS.Agent.Services
{
    public static class DPAPIStorage
    {
        private static readonly string StoragePath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
            "NKB_ITMS_Agent",
            "agent_credentials.dat"
        );

        public static void SaveConfig(AgentConfig config)
        {
            try {
                var dir = Path.GetDirectoryName(StoragePath);
                if (!Directory.Exists(dir) && dir != null) {
                    Directory.CreateDirectory(dir);
                }

                string json = JsonSerializer.Serialize(config);
                byte[] rawBytes = Encoding.UTF8.GetBytes(json);
                byte[] encryptedBytes = ProtectedData.Protect(rawBytes, null, DataProtectionScope.LocalMachine);
                File.WriteAllBytes(StoragePath, encryptedBytes);
            } catch (Exception ex) {
                Console.WriteLine($"[DPAPIStorage] Save error: {ex.Message}");
            }
        }

        public static AgentConfig LoadConfig()
        {
            try {
                if (!File.Exists(StoragePath)) {
                    return new AgentConfig();
                }

                byte[] encryptedBytes = File.ReadAllBytes(StoragePath);
                byte[] rawBytes = ProtectedData.Unprotect(encryptedBytes, null, DataProtectionScope.LocalMachine);
                string json = Encoding.UTF8.GetString(rawBytes);
                return JsonSerializer.Deserialize<AgentConfig>(json) ?? new AgentConfig();
            } catch {
                return new AgentConfig();
            }
        }
    }
}
