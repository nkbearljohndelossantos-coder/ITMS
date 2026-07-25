using System;
using System.Collections.Generic;

namespace Nkb.Backup.Agent.Contracts
{
    public class EnrollmentRequest
    {
        public string EnrollmentToken { get; set; } = string.Empty;
        public string DeviceId { get; set; } = string.Empty;
        public string DeviceName { get; set; } = string.Empty;
        public string Hostname { get; set; } = string.Empty;
        public string? IpAddress { get; set; }
        public string? MacAddress { get; set; }
        public string? OsVersion { get; set; }
        public string AgentVersion { get; set; } = "1.0.0";
        public string PublicKeyPem { get; set; } = string.Empty;
    }

    public class EnrollmentResponse
    {
        public bool Success { get; set; }
        public EnrollmentData? Data { get; set; }
        public string? Error { get; set; }
    }

    public class EnrollmentData
    {
        public string DeviceId { get; set; } = string.Empty;
        public int DeviceDbId { get; set; }
        public string Fingerprint { get; set; } = string.Empty;
        public string DeviceAuthCredentialToken { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
    }

    public class HeartbeatPayload
    {
        public string DeviceId { get; set; } = string.Empty;
        public string AgentVersion { get; set; } = "1.0.0";
        public List<DiskInventoryDto>? DiskInventory { get; set; }
    }

    public class DiskInventoryDto
    {
        public int DiskNumber { get; set; }
        public string Model { get; set; } = string.Empty;
        public string Manufacturer { get; set; } = string.Empty;
        public string SerialNumber { get; set; } = string.Empty;
        public string BusType { get; set; } = "NVMe"; // NVMe, SSD, HDD, USB
        public long CapacityBytes { get; set; }
        public string PartitionStyle { get; set; } = "GPT"; // GPT, MBR
        public bool IsBootDisk { get; set; }
        public bool IsSystemDisk { get; set; }
        public string SmartHealth { get; set; } = "OK";
        public List<VolumeInventoryDto> Volumes { get; set; } = new();
    }

    public class VolumeInventoryDto
    {
        public string DriveLetter { get; set; } = string.Empty;
        public string VolumeLabel { get; set; } = string.Empty;
        public string Filesystem { get; set; } = "NTFS";
        public long TotalBytes { get; set; }
        public long FreeBytes { get; set; }
        public bool IsSystemVolume { get; set; }
        public bool IsBitLockerEnabled { get; set; }
    }

    public class JobProgressPayload
    {
        public int ExecutionId { get; set; }
        public string LeaseId { get; set; } = string.Empty;
        public string State { get; set; } = "reading";
        public int ProgressPercent { get; set; }
        public decimal TransferSpeedMbps { get; set; }
        public long BytesScanned { get; set; }
        public long BytesRead { get; set; }
        public long BytesTransferred { get; set; }
        public long FilesProcessed { get; set; }
        public string? ErrorMessage { get; set; }
    }
}
