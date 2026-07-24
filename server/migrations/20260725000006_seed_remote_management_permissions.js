exports.up = async function(knex) {
  // 1. Idempotent insertion of 16 remote permissions
  const remotePermissions = [
    { code: 'remote_device.view', name: 'View Managed Devices', description: 'Allows viewing remote device telemetry and dashboard' },
    { code: 'remote_device.request_access', name: 'Request Remote Access', description: 'Allows requesting attended employee access' },
    { code: 'remote_device.control', name: 'Remote Control', description: 'Allows establishing full control remote sessions' },
    { code: 'remote_device.view_only', name: 'View-Only Remote Access', description: 'Allows view-only screen viewing' },
    { code: 'remote_device.unattended', name: 'Unattended Remote Access', description: 'Allows connecting to approved devices without employee prompt' },
    { code: 'remote_device.file_transfer', name: 'Remote File Manager', description: 'Allows transferring files to/from managed devices' },
    { code: 'remote_device.terminal', name: 'Remote Terminal Console', description: 'Allows executing remote PowerShell/CMD commands' },
    { code: 'remote_device.process_manage', name: 'Manage Processes', description: 'Allows viewing and killing remote processes' },
    { code: 'remote_device.service_manage', name: 'Manage Services', description: 'Allows starting/stopping/restarting Windows services' },
    { code: 'remote_device.power_manage', name: 'Remote Power Actions', description: 'Allows immediate shutdown, restart, logoff, lock' },
    { code: 'remote_device.schedule_power', name: 'Schedule Power Actions', description: 'Allows creating automated recurring shutdown schedules' },
    { code: 'remote_device.manage_agents', name: 'Manage Agent Deployment', description: 'Allows downloading installers and GPO packages' },
    { code: 'remote_device.manage_protected_devices', name: 'Manage Protected Devices', description: 'Allows configuring infrastructure protection exclusions' },
    { code: 'remote_device.view_session_history', name: 'View Session History', description: 'Allows viewing historical session logs and recordings' },
    { code: 'remote_device.view_audit_logs', name: 'View Remote Audit Logs', description: 'Allows viewing append-only audit trail' },
    { code: 'remote_device.manage_settings', name: 'Manage Remote Settings', description: 'Allows configuring gateway settings and Production Gate signoff' }
  ];

  const superAdminRole = await knex('roles').where({ id: 1 }).first();
  const itManagerRole = await knex('roles').where({ id: 2 }).first();

  for (const perm of remotePermissions) {
    let permId;
    const existing = await knex('permissions').where({ code: perm.code }).first();
    if (!existing) {
      const [id] = await knex('permissions').insert(perm);
      permId = Array.isArray(id) ? id[0] : id;
    } else {
      permId = existing.id;
    }

    if (superAdminRole) {
      const rp1 = await knex('role_permissions').where({ role_id: 1, permission_id: permId }).first();
      if (!rp1) await knex('role_permissions').insert({ role_id: 1, permission_id: permId });
    }

    if (itManagerRole) {
      const rp2 = await knex('role_permissions').where({ role_id: 2, permission_id: permId }).first();
      if (!rp2) await knex('role_permissions').insert({ role_id: 2, permission_id: permId });
    }
  }

  // 2. Default remote management settings
  const defaultSettings = [
    { setting_key: 'meshcentral_server_url', setting_value: 'wss://meshcentral.nkb-itms.com', description: 'Self-hosted MeshCentral Gateway WSS URL' },
    { setting_key: 'meshcentral_api_user', setting_value: 'itms_admin', description: 'MeshCentral Service Account' },
    { setting_key: 'meshcentral_api_token_hash', setting_value: 'sha256_mock_token_hash_value', description: 'Hashed Service Account API Secret' },
    { setting_key: 'default_session_timeout_minutes', setting_value: '60', description: 'Automatic session timeout limit' },
    { setting_key: 'require_attended_consent_default', setting_value: 'true', description: 'Require employee consent by default' },
    { setting_key: 'visible_local_notification_default', setting_value: 'true', description: 'Show visible remote control badge on endpoint' },
    { setting_key: 'audit_chain_verification_status', setting_value: 'VALIDATED', description: 'Status of append-only audit hash chain' }
  ];

  for (const setItem of defaultSettings) {
    const existing = await knex('remote_management_settings').where({ setting_key: setItem.setting_key }).first();
    if (!existing) {
      await knex('remote_management_settings').insert(setItem);
    }
  }

  // 3. 12 Production Activation Gate Checklist Items
  const gateItems = [
    { check_code: 'GATE_01_TLS', check_title: 'MeshCentral Reverse Proxy TLS Certificate Validation', description: 'Valid TLS certificate on MeshCentral WSS endpoint' },
    { check_code: 'GATE_02_AUTH', check_title: 'Server-to-Server Authentication Validation', description: 'MeshCentral API service token authenticated' },
    { check_code: 'GATE_03_RBAC', check_title: 'RBAC Enforcement Verification', description: 'Permissions verified across all 16 remote_device.* controls' },
    { check_code: 'GATE_04_REAUTH', check_title: 'Technician Re-authentication Verification', description: 'Re-authentication mandatory for privileged actions' },
    { check_code: 'GATE_05_CONSENT', check_title: 'Attended Consent Flow Verification', description: 'Endpoint agent HMAC-signed consent validation' },
    { check_code: 'GATE_06_PROTECTED', check_title: 'Protected Devices & Infrastructure Exclusions', description: 'Production-critical PCs protected from accidental actions' },
    { check_code: 'GATE_07_EXPIRATION', check_title: 'Single-Use Token Expiration Verification', description: '5-minute single-use token binding verified' },
    { check_code: 'GATE_08_AUDIT_HASH', check_title: 'Hash-Chained Audit Record Integrity', description: 'Append-only audit chain integrity sign-off' },
    { check_code: 'GATE_09_IDEMPOTENCY', check_title: 'Command Idempotency & Scheduler Lock Verification', description: 'Distributed locks & idempotency keys verified' },
    { check_code: 'GATE_10_BACKUP', check_title: 'Database Backup & Rollback Procedure Test', description: 'Backup/restore validated' },
    { check_code: 'GATE_11_REVOCATION', check_title: 'Emergency Access Revocation Test', description: 'Instant killswitch for active sessions validated' },
    { check_code: 'GATE_12_PILOT', check_title: 'Staging Pilot Rollout Sign-Off', description: 'Non-critical computer pilot sign-off completed' }
  ];

  for (const g of gateItems) {
    const existing = await knex('production_activation_gates').where({ check_code: g.check_code }).first();
    if (!existing) {
      await knex('production_activation_gates').insert(g);
    }
  }

  // 4. Sample Managed Devices
  const deviceCount = await knex('managed_devices').count('* as count').first();
  if (parseInt(deviceCount.count) === 0) {
    const sampleDevices = [
      {
        device_id: 'DEV-WIN11-OFFICE01',
        name: 'NKB-DESKTOP-JDELOSSANTOS',
        ip_address: '192.168.10.105',
        mac_address: '74:56:3C:99:A1:B2',
        os_name: 'Windows 11 Pro 23H2',
        os_version: '10.0.22631',
        logged_in_user: 'NKB\\jdelossantos',
        agent_version: 'v1.2.4',
        is_online: true,
        remote_access_enabled: true,
        protected_status: false,
        approved_access_mode: 'attended',
        is_simulated: true,
        last_heartbeat: new Date()
      },
      {
        device_id: 'DEV-SERVER-MAINSQL',
        name: 'NKB-SRV-DATABASESQL01',
        ip_address: '192.168.10.200',
        mac_address: '00:50:56:A1:B2:C3',
        os_name: 'Windows Server 2022 Datacenter',
        os_version: '10.0.20348',
        logged_in_user: 'NT AUTHORITY\\SYSTEM',
        agent_version: 'v1.2.4',
        is_online: true,
        remote_access_enabled: true,
        protected_status: true,
        approved_access_mode: 'unattended',
        is_simulated: true,
        last_heartbeat: new Date()
      },
      {
        device_id: 'DEV-WORKSTATION-CAD',
        name: 'NKB-CAD-ENGINEERING03',
        ip_address: '192.168.10.112',
        mac_address: '3C:7C:3F:88:11:22',
        os_name: 'Windows 11 Enterprise 23H2',
        os_version: '10.0.22631',
        logged_in_user: 'NKB\\engineer01',
        agent_version: 'v1.2.4',
        is_online: true,
        remote_access_enabled: true,
        protected_status: false,
        approved_access_mode: 'attended',
        is_simulated: true,
        last_heartbeat: new Date()
      },
      {
        device_id: 'DEV-PLANT-MONITOR02',
        name: 'NKB-PLANT-MONITORING02',
        ip_address: '192.168.10.180',
        mac_address: 'A4:BB:6D:44:55:66',
        os_name: 'Windows 10 Enterprise LTSC',
        os_version: '10.0.19045',
        logged_in_user: 'NKB\\plantoperator',
        agent_version: 'v1.2.4',
        is_online: true,
        remote_access_enabled: true,
        protected_status: false,
        approved_access_mode: 'attended',
        is_simulated: true,
        last_heartbeat: new Date()
      },
      {
        device_id: 'DEV-LAPTOP-MGMT05',
        name: 'NKB-NB-MANAGER05',
        ip_address: '192.168.10.155',
        mac_address: 'E8:9C:25:33:44:55',
        os_name: 'Windows 11 Pro 23H2',
        os_version: '10.0.22631',
        logged_in_user: 'NKB\\manager05',
        agent_version: 'v1.2.4',
        is_online: false,
        remote_access_enabled: true,
        protected_status: false,
        approved_access_mode: 'attended',
        is_simulated: true,
        last_heartbeat: new Date(Date.now() - 3600000)
      }
    ];

    for (const dev of sampleDevices) {
      await knex('managed_devices').insert(dev);
    }
  }
};

exports.down = async function(knex) {
  const codes = [
    'remote_device.view', 'remote_device.request_access', 'remote_device.control', 'remote_device.view_only',
    'remote_device.unattended', 'remote_device.file_transfer', 'remote_device.terminal', 'remote_device.process_manage',
    'remote_device.service_manage', 'remote_device.power_manage', 'remote_device.schedule_power', 'remote_device.manage_agents',
    'remote_device.manage_protected_devices', 'remote_device.view_session_history', 'remote_device.view_audit_logs', 'remote_device.manage_settings'
  ];
  
  const permIds = await knex('permissions').whereIn('code', codes).pluck('id');
  if (permIds.length > 0) {
    await knex('role_permissions').whereIn('permission_id', permIds).del();
    await knex('permissions').whereIn('id', permIds).del();
  }
  await knex('managed_devices').where('is_simulated', true).del();
};
