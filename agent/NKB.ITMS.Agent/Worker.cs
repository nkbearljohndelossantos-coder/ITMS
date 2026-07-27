using NKB.ITMS.Agent.Collectors;
using NKB.ITMS.Agent.Config;
using NKB.ITMS.Agent.Services;

namespace NKB.ITMS.Agent
{
    public class Worker : BackgroundService
    {
        private readonly ILogger<Worker> _logger;
        private readonly ApiClient _apiClient;
        private readonly AgentConfig _config;

        public Worker(ILogger<Worker> logger, ApiClient apiClient, AgentConfig config)
        {
            _logger = logger;
            _apiClient = apiClient;
            _config = config;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("NKB ITMS Agent service starting at: {time}", DateTimeOffset.Now);

            // 1. Enrollment check
            if (string.IsNullOrWhiteSpace(_config.AgentUuid) && !string.IsNullOrWhiteSpace(_config.EnrollmentToken)) {
                _logger.LogInformation("Attempting enrollment with token...");
                bool enrolled = await _apiClient.EnrollAsync();
                if (enrolled) {
                    _logger.LogInformation("Agent enrolled successfully! AgentUUID: {uuid}", _config.AgentUuid);
                } else {
                    _logger.LogWarning("Agent enrollment failed or token invalid.");
                }
            }

            int loopCount = 0;

            while (!stoppingToken.IsCancellationRequested) {
                try {
                    // Send Heartbeat every 30 seconds
                    bool hbOk = await _apiClient.SendHeartbeatAsync();
                    _logger.LogInformation("Heartbeat status: {status}", hbOk ? "OK" : "Failed");

                    // Every 10 loops (~5 mins), send full hardware, software, and security inventory
                    if (loopCount % 10 == 0) {
                        _logger.LogInformation("Collecting & sending hardware inventory...");
                        var hw = HardwareCollector.CollectAll();
                        await _apiClient.SendHardwareInventoryAsync(hw);

                        _logger.LogInformation("Collecting & sending software inventory...");
                        var sw = SoftwareCollector.CollectInstalledSoftware();
                        await _apiClient.SendSoftwareInventoryAsync(sw);

                        _logger.LogInformation("Collecting & sending security inventory...");
                        var sec = SecurityCollector.CollectSecurityInfo();
                        await _apiClient.SendSecurityInventoryAsync(sec);
                    }

                    loopCount++;
                } catch (Exception ex) {
                    _logger.LogError(ex, "Error in Agent main loop.");
                }

                await Task.Delay(30000, stoppingToken);
            }
        }
    }
}
