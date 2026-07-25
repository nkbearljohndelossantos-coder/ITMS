using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Nkb.Backup.Agent.Service;

var builder = Host.CreateDefaultBuilder(args)
    .UseWindowsService(options =>
    {
        options.ServiceName = "NKB Backup Agent";
    })
    .ConfigureServices(services =>
    {
        services.AddHostedService<Worker>();
    });

var host = builder.Build();
await host.RunAsync();
