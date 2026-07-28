# Enterprise Work Mode Security & Android Enterprise MDM Architecture

## System Overview
The **NKB ITMS Enterprise Mobile Device Management (MDM) Platform** combines Android Enterprise Device Owner APIs, a 7-layer security filtering engine, real-time Socket.IO command center synchronization, and automated Work Mode controls into a unified corporate security ecosystem.

---

## 1. Android Enterprise Device Owner Provisioning

### QR Code Provisioning Payload Specification
To provision a company-owned Android device as Device Owner, generate a single-use QR Code containing the signed JSON payload below:

```json
{
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME": "com.nkb.itms.mdm/.receiver.DeviceAdminReceiver",
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION": "https://itms.nkbmanufacturing.com/downloads/nkb-itms-mdm-agent.apk",
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_CHECKSUM": "A4B3C2D1E5F67890123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0",
  "android.app.extra.PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED": true,
  "android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE": {
    "server_url": "https://itms.nkbmanufacturing.com",
    "enrollment_token": "NKB-MDM-QR-9F8E7D6C",
    "signature": "HMAC_SHA256_HASH_STRING"
  }
}
```

---

## 2. 7-Layer Security Filtering Engine

| Layer | Component | Description |
|---|---|---|
| **Layer 1** | OS Device Owner Policies | `DevicePolicyManager.setApplicationHidden` & `setUninstallBlocked` |
| **Layer 2** | Always-On Managed VPN | Local `VpnService` sinkhole intercepting web traffic across all browsers |
| **Layer 3** | Enterprise DNS Filtering | Wildcard matcher (`*.bet`, `*.sabong`, `bet88.com`) & Category rules |
| **Layer 4** | App Package Hiding | Continuous scan & hide for gambling apps (`com.ph.sabong.live`, `com.bet88.ph`) |
| **Layer 5** | Offline Local Cache | Encrypted SQLite / SharedPrefs policy storage |
| **Layer 6** | Socket.IO Real-time Sync | Sub-second command dispatch (`ENABLE_WORK_MODE`, `EMERGENCY_LOCK`) |
| **Layer 7** | Offline Enforcement & Anti-Tamper | Background threat detection (Root, USB Debugging, Fake GPS) |

---

## 3. Remote Command Center Protocol
Commands are transmitted via Socket.IO over channel `webfilter:command`:

- `ENABLE_WORK_MODE`: Enforces VPN filtering, hides gambling apps, restricts non-company browsers.
- `DISABLE_WORK_MODE`: Restores normal phone operation, unhides applications.
- `EMERGENCY_LOCK`: Immediately hides non-company apps, disables Camera, Screenshots, and USB File Transfer, displaying custom IT lock screen.
- `LOCK_DEVICE` / `UNLOCK_DEVICE`: Remote screen lock.
- `LOCATE_DEVICE`: Real-time GPS coordinate ping.
- `RING_DEVICE`: High-volume alarm trigger.
- `WIPE_COMPANY_DATA`: Clears enterprise data container.
- `FACTORY_RESET`: Full Device Owner wipe with confirmation workflow.
