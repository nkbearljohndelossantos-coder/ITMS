using NKB.ITMS.Agent.Config;
using NKB.ITMS.Agent.Services;

namespace NKB.ITMS.Agent
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = Host.CreateApplicationBuilder(args);
            builder.Services.AddWindowsService(options => {
                options.ServiceName = "NKB ITMS Agent";
            });

            // Load DPAPI credentials
            var config = DPAPIStorage.LoadConfig();

            // Override from CLI args if provided (e.g. SERVER_URL="http://..." ENROLLMENT_TOKEN="...")
            foreach (var arg in args) {
                if (arg.StartsWith("SERVER_URL=")) {
                    config.ServerUrl = arg.Replace("SERVER_URL=", "").Trim('"');
                }
                if (arg.StartsWith("ENROLLMENT_TOKEN=")) {
                    config.EnrollmentToken = arg.Replace("ENROLLMENT_TOKEN=", "").Trim('"');
                }
            }

            builder.Services.AddSingleton(config);
            builder.Services.AddHttpClient<ApiClient>();
            builder.Services.AddHostedService<Worker>();

            var host = builder.Build();
            host.Run();
        }
    }
}
