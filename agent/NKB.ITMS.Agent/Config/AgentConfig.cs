namespace NKB.ITMS.Agent.Config
{
    public class AgentConfig
    {
        public string ServerUrl { get; set; } = "http://localhost:5000";
        public string EnrollmentToken { get; set; } = "";
        public string AgentUuid { get; set; } = "";
        public string AgentKey { get; set; } = "";
        public int HeartbeatIntervalSeconds { get; set; } = 30;
        public int PerformanceMetricsIntervalSeconds { get; set; } = 60;
        public int HardwareInventoryIntervalHours { get; set; } = 12;
        public int SoftwareInventoryIntervalHours { get; set; } = 6;
        public int SecurityInventoryIntervalMinutes { get; set; } = 30;
    }
}
