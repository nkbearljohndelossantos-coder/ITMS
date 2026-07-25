# NKB Backup Agent Windows Service PowerShell Installer
# Requires Administrator Privileges

[CmdletBinding()]
param (
    [Parameter(Mandatory=$true)]
    [string]$ServerUrl,

    [Parameter(Mandatory=$true)]
    [string]$EnrollmentToken,

    [Parameter(Mandatory=$false)]
    [string]$DeviceName = $env:COMPUTERNAME,

    [Parameter(Mandatory=$false)]
    [string]$InstallDir = "C:\Program Files\NKB Backup Agent"
)

Write-Host "=========================================================" -ForegroundColor Gold
Write-Host " NKB Enterprise Backup Agent - Windows Service Installer" -ForegroundColor White
Write-Host "=========================================================" -ForegroundColor Gold

# Check Admin Rights
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "Administrator privileges required to install Windows Service. Please run PowerShell as Administrator."
    exit 1
}

Write-Host "[1/5] Creating installation directory: $InstallDir" -ForegroundColor Cyan
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

Write-Host "[2/5] Performing One-Time Device Enrollment with $ServerUrl..." -ForegroundColor Cyan

# Generate RSA Key Pair
$rsa = [System.Security.Cryptography.RSA]::Create(2048)
$publicKeyPem = $rsa.ExportRSAPublicKeyPem()

$deviceId = "NKB-DEV-" + [Guid]::NewGuid().ToString("N").Substring(0, 12).ToUpper()

$enrollPayload = @{
    enrollmentToken = $EnrollmentToken
    deviceId = $deviceId
    deviceName = $DeviceName
    hostname = $env:COMPUTERNAME
    agentVersion = "1.0.0"
    publicKeyPem = $publicKeyPem
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$ServerUrl/api/v1/backups/agents/enroll" -Method Post -Body $enrollPayload -ContentType "application/json"
    if ($response.success) {
        Write-Host " -> Enrollment Successful! Device ID: $deviceId" -ForegroundColor Green
    } else {
        Write-Error "Enrollment failed: $($response.error)"
        exit 1
    }
} catch {
    Write-Error "Failed to connect to NKB Server: $_"
    exit 1
}

# Save Encrypted Credential via Windows DPAPI (Mandatory Correction #5)
$configDir = "$env:ProgramData\NKBBackupAgent"
if (-not (Test-Path $configDir)) { New-Item -ItemType Directory -Path $configDir -Force | Out-Null }

Set-Content -Path "$configDir\device_id.txt" -Value $deviceId -Force
$credBytes = [System.Text.Encoding]::UTF8.GetBytes($response.data.deviceAuthCredentialToken)
$protectedBytes = [System.Security.Cryptography.ProtectedData]::Protect($credBytes, $null, [System.Security.Cryptography.DataProtectionScope]::LocalMachine)
[System.IO.File]::WriteAllBytes("$configDir\credential.dpapi", $protectedBytes)

Write-Host "[3/5] Registering Windows Service 'NKB Backup Agent'..." -ForegroundColor Cyan

$serviceName = "NKBBackupAgent"
$serviceDisplayName = "NKB Backup Agent"
$serviceDescription = "Enterprise Backup, File Imaging & Restore Service for NKB IT Management System"

$existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host " -> Stopping existing service..." -ForegroundColor Yellow
    Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
    sc.exe delete $serviceName | Out-Null
    Start-Sleep -Seconds 2
}

# Create Windows Service with Automatic Startup (Mandatory Correction #4)
$serviceExePath = Join-Path $InstallDir "Nkb.Backup.Agent.Service.exe"
New-Service -Name $serviceName `
            -DisplayName $serviceDisplayName `
            -Description $serviceDescription `
            -BinaryPathName "`"$serviceExePath`"" `
            -StartupType Automatic `
            -ErrorAction Stop | Out-Null

# Set Recovery Actions (Restart on Failure)
sc.exe failure $serviceName reset= 86400 actions= restart/60000/restart/60000/restart/60000 | Out-Null

Write-Host "[4/5] Starting Service..." -ForegroundColor Cyan
Start-Service -Name $serviceName

Write-Host "[5/5] Installation & Verification Complete!" -ForegroundColor Green
Write-Host "Service Status: $((Get-Service -Name $serviceName).Status)" -ForegroundColor White
