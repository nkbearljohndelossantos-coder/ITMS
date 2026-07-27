# NKB ITMS Windows Agent Architecture

## Overview
The **NKB ITMS Windows Agent** is a native C# .NET 8 Background Worker Service running under Windows Service Control Manager (`NKB.ITMS.Agent`). It automatically collects hardware details, OS information, software inventory, Defender security status, and lightweight performance metrics, reporting back to the NKB ITMS Web Application.

## Key Components
1. **Worker Service (`Worker.cs`)**: Main loop executing periodic heartbeats (30s) and full inventory collections (12h).
2. **Collectors (`Collectors/`)**:
   - `HardwareCollector.cs`: System, CPU, RAM, Disks, Volumes, Network.
   - `SoftwareCollector.cs`: 64-bit and 32-bit Registry scanner for installed applications.
   - `SecurityCollector.cs`: Defender, Firewall, BitLocker, TPM 2.0, SecureBoot.
3. **DPAPI Credential Storage (`DPAPIStorage.cs`)**: Encrypts sensitive agent credentials using Windows Data Protection API (`ProtectedData.Protect`).
4. **SQLite Offline Queue (`SQLiteQueueManager.cs`)**: Buffers telemetry when offline and resends when network connectivity returns.
5. **Backend Agent Ingestion API (`server/src/routes/agentApi.js`)**: Express endpoint handling `/enroll`, `/heartbeat`, `/inventory/hardware`, `/inventory/software`, `/inventory/security`, and `/metrics`.
