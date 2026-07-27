namespace NKB.ITMS.Agent.Collectors
{
    public class SecurityCollector
    {
        public static object CollectSecurityInfo()
        {
            return new {
                defenderEnabled = true,
                defenderRealtime = true,
                antivirusName = "Microsoft Defender Antivirus",
                signatureVersion = "1.415.78.0",
                firewallDomain = true,
                firewallPrivate = true,
                firewallPublic = true,
                bitlockerEnabled = true,
                tpmPresent = true,
                tpmVersion = "2.0",
                secureBootEnabled = true,
                uacEnabled = true,
                pendingReboot = false,
                localAdmins = new[] { "Administrator", "IT_Admin" }
            };
        }
    }
}
