using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using NKB.ITMS.Agent.Config;

namespace NKB.ITMS.Agent.Services
{
    public class ApiClient
    {
        private readonly HttpClient _client;
        private readonly AgentConfig _config;

        public ApiClient(HttpClient client, AgentConfig config)
        {
            _client = client;
            _config = config;
            _client.BaseAddress = new Uri(_config.ServerUrl.TrimEnd('/') + "/");
        }

        public async Task<bool> EnrollAsync()
        {
            if (string.IsNullOrWhiteSpace(_config.EnrollmentToken)) return false;

            try {
                var payload = new {
                    enrollmentToken = _config.EnrollmentToken,
                    hostname = Environment.MachineName,
                    deviceUuid = "DEV-" + Environment.MachineName,
                    osName = "Windows 11 Pro",
                    osVersion = "23H2",
                    osBuild = "22631",
                    architecture = Environment.Is64BitOperatingSystem ? "x64" : "x86",
                    currentIp = "192.168.1.100",
                    currentUser = Environment.UserName,
                    agentVersion = "1.0.0"
                };

                var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                var response = await _client.PostAsync("api/v1/agent/enroll", content);
                if (response.IsSuccessStatusCode) {
                    var json = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(json);
                    var data = doc.RootElement.GetProperty("data");

                    _config.AgentUuid = data.GetProperty("agentUuid").GetString() ?? "";
                    _config.AgentKey = data.GetProperty("agentKey").GetString() ?? "";
                    DPAPIStorage.SaveConfig(_config);
                    return true;
                }
            } catch (Exception ex) {
                Console.WriteLine($"[ApiClient] Enrollment error: {ex.Message}");
            }
            return false;
        }

        public async Task<bool> SendHeartbeatAsync()
        {
            if (string.IsNullOrWhiteSpace(_config.AgentUuid)) return false;

            try {
                var payload = new {
                    currentIp = "192.168.1.100",
                    currentUser = Environment.UserName,
                    cpuPercent = 12.5,
                    memoryPercent = 48.2,
                    diskPercent = 65.4,
                    uptimeSeconds = Environment.TickCount / 1000,
                    healthStatus = "HEALTHY",
                    agentVersion = "1.0.0"
                };

                var request = new HttpRequestMessage(HttpMethod.Post, "api/v1/agent/heartbeat") {
                    Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
                };
                request.Headers.Add("X-Agent-UUID", _config.AgentUuid);
                request.Headers.Add("X-Agent-Key", _config.AgentKey);

                var response = await _client.SendAsync(request);
                return response.IsSuccessStatusCode;
            } catch {
                return false;
            }
        }

        public async Task<bool> SendHardwareInventoryAsync(object hardwareData)
        {
            return await SendAuthenticatedPostAsync("api/v1/agent/inventory/hardware", hardwareData);
        }

        public async Task<bool> SendSoftwareInventoryAsync(List<object> softwareData)
        {
            return await SendAuthenticatedPostAsync("api/v1/agent/inventory/software", new { software = softwareData });
        }

        public async Task<bool> SendSecurityInventoryAsync(object securityData)
        {
            return await SendAuthenticatedPostAsync("api/v1/agent/inventory/security", securityData);
        }

        private async Task<bool> SendAuthenticatedPostAsync(string endpoint, object data)
        {
            if (string.IsNullOrWhiteSpace(_config.AgentUuid)) return false;

            try {
                var request = new HttpRequestMessage(HttpMethod.Post, endpoint) {
                    Content = new StringContent(JsonSerializer.Serialize(data), Encoding.UTF8, "application/json")
                };
                request.Headers.Add("X-Agent-UUID", _config.AgentUuid);
                request.Headers.Add("X-Agent-Key", _config.AgentKey);

                var response = await _client.SendAsync(request);
                return response.IsSuccessStatusCode;
            } catch {
                return false;
            }
        }
    }
}
