using Microsoft.Win32;

namespace NKB.ITMS.Agent.Collectors
{
    public class SoftwareCollector
    {
        public static List<object> CollectInstalledSoftware()
        {
            var softwareList = new List<object>();
            string[] registryKeys = new[] {
                @"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
                @"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"
            };

            foreach (var keyPath in registryKeys) {
                try {
                    using var hklm = RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, RegistryView.Registry64);
                    using var key = hklm.OpenSubKey(keyPath);
                    if (key != null) {
                        foreach (var subkeyName in key.GetSubKeyNames()) {
                            try {
                                using var subkey = key.OpenSubKey(subkeyName);
                                string name = subkey?.GetValue("DisplayName")?.ToString() ?? "";
                                if (!string.IsNullOrWhiteSpace(name)) {
                                    softwareList.Add(new {
                                        name,
                                        version = subkey?.GetValue("DisplayVersion")?.ToString() ?? "1.0",
                                        publisher = subkey?.GetValue("Publisher")?.ToString() ?? "Unknown",
                                        installDate = subkey?.GetValue("InstallDate")?.ToString() ?? "",
                                        installLocation = subkey?.GetValue("InstallLocation")?.ToString() ?? "",
                                        uninstallString = subkey?.GetValue("UninstallString")?.ToString() ?? "",
                                        architecture = keyPath.Contains("WOW6432Node") ? "x86" : "x64"
                                    });
                                }
                            } catch { }
                        }
                    }
                } catch { }
            }

            return softwareList.GroupBy(x => ((dynamic)x).name).Select(g => g.First()).ToList();
        }
    }
}
