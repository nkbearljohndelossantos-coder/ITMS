using System;
using System.IO;
using System.Net.Http;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Nkb.Backup.Agent.Contracts;
using Nkb.Backup.Agent.Core;

namespace Nkb.Backup.Agent.Service
{
    public class Worker : BackgroundService
    {
        private readonly ILogger<Worker> _logger;
        private readonly HttpClient _httpClient;

        private string _serverUrl = "http://localhost:5000";
        private string _deviceId = string.Empty;
        private string _credentialToken = string.Empty;
        private bool _isEnrolled = false;

        public Worker(ILogger<Worker> logger)
        {
            _logger = logger;
            _httpClient = new HttpClient();
        }

        public override async Task StartAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("NKB Backup Agent Service starting up...");

            // Load device identity & DPAPI encrypted secrets (Mandatory Correction #5)
            LoadOrInitializeDeviceIdentity();

            await base.StartAsync(cancellationToken);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("NKB Backup Agent background execution loop active.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    if (!_isEnrolled)
                    {
                        _logger.LogWarning("NKB Backup Agent is not yet enrolled. Awaiting enrollment token...");
                        await Task.Delay(10000, stoppingToken);
                        continue;
                    }

                    // Perform 30s Heartbeat (Mandatory Correction #6)
                    await SendHeartbeatAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in Agent service loop: {Message}", ex.Message);
                }

                await Task.Delay(30000, stoppingToken); // 30-second heartbeat interval
            }
        }

        private void LoadOrInitializeDeviceIdentity()
        {
            string configDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "NKBBackupAgent");
            Directory.CreateDirectory(configDir);

            string idPath = Path.Combine(configDir, "device_id.txt");
            if (File.Exists(idPath))
            {
                _deviceId = File.ReadAllText(idPath).Trim();
            }
            else
            {
                _deviceId = "NKB-DEV-" + Guid.NewGuid().ToString("N")[..12].ToUpperInvariant();
                File.WriteAllText(idPath, _deviceId);
            }

            string credPath = Path.Combine(configDir, "credential.dpapi");
            if (File.Exists(credPath))
            {
                byte[] encryptedBytes = File.ReadAllBytes(credPath);
                byte[] decryptedBytes = ProtectedData.Unprotect(encryptedBytes, null, DataProtectionScope.LocalMachine);
                _credentialToken = Encoding.UTF8.GetString(decryptedBytes);
                _isEnrolled = true;
                _logger.LogInformation("Loaded DPAPI encrypted agent credential for Device ID: {DeviceId}", _deviceId);
            }
            else
            {
                _logger.LogInformation("No DPAPI credential found. Device ID: {DeviceId}", _deviceId);
            }
        }

        private async Task SendHeartbeatAsync(CancellationToken ct)
        {
            var heartbeat = new HeartbeatPayload
            {
                DeviceId = _deviceId,
                AgentVersion = "1.0.0"
            };

            var reqMsg = new HttpRequestMessage(HttpMethod.Post, $"{_serverUrl}/api/v1/backups/agents/heartbeat")
            {
                Content = JsonContent.Create(heartbeat)
            };
            reqMsg.Headers.Add("X-Device-Id", _deviceId);
            reqMsg.Headers.Add("X-Device-Credential", _credentialToken);

            var response = await _httpClient.SendAsync(reqMsg, ct);
            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Agent 30s Heartbeat acknowledged cleanly by NKB ITMS Server.");
            }
            else
            {
                _logger.LogWarning("Heartbeat response returned status: {Status}", response.StatusCode);
            }
        }
    }
}
