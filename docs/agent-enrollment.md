# Agent Enrollment & Silent Deployment

## Enrollment Workflow
1. Navigate to any Computer Asset profile in ITMS.
2. Click **Generate Enrollment Token** to create a single-use 15-minute token (`NKB-XXXXXXXXXXXXXXXX`).
3. Deploy the Windows MSI Agent silently using PowerShell or GPO:

```powershell
msiexec /i NKB-ITMS-Agent.msi ENROLLMENT_TOKEN="NKB-TOKENVALUE" SERVER_URL="http://itms.nkb.local:5000" /qn
```

4. The Windows Service starts automatically (`NKB ITMS Agent`), validates the token, receives its permanent encrypted `AgentUUID` and `AgentKey`, and sends initial inventory telemetry.
