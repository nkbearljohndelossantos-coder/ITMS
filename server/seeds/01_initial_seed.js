const bcrypt = require('bcrypt');

exports.seed = async function(knex) {
  if (knex.client.config.client === 'sqlite3') {
    await knex.raw('PRAGMA foreign_keys = OFF;');
  } else {
    await knex.raw('SET FOREIGN_KEY_CHECKS = 0;');
  }

  // Deletes ALL existing entries in dependent tables to clean the slate
  await knex('number_sequences').del();
  await knex('system_settings').del();
  await knex('audit_logs').del();
  await knex('notifications').del();
  await knex('license_assignments').del();
  await knex('software_licenses').del();
  await knex('inventory_transactions').del();
  await knex('maintenance_results').del();
  await knex('maintenance_checklists').del();
  await knex('maintenance_schedules').del();
  await knex('repair_parts').del();
  await knex('repairs').del();
  await knex('inventory_items').del();
  await knex('inventory_categories').del();
  await knex('ticket_time_logs').del();
  await knex('ticket_history').del();
  await knex('ticket_attachments').del();
  await knex('ticket_internal_notes').del();
  await knex('ticket_comments').del();
  await knex('tickets').del();
  await knex('ticket_categories').del();
  await knex('asset_assignments').del();
  await knex('asset_history').del();
  await knex('asset_documents').del();
  await knex('assets').del();
  await knex('asset_categories').del();
  await knex('employees').del();
  await knex('positions').del();
  await knex('departments').del();
  await knex('password_reset_tokens').del();
  await knex('refresh_tokens').del();
  await knex('user_roles').del();
  await knex('users').del();
  await knex('role_permissions').del();
  await knex('permissions').del();
  await knex('roles').del();

  // Also clear the new modules tables to ensure clean slate
  await knex('website_uptime_logs').del();
  await knex('website_monitoring').del();
  await knex('guest_wifi_accounts').del();
  await knex('network_history_logs').del();
  await knex('ip_allocations').del();
  await knex('wifi_networks').del();
  await knex('file_share_permissions').del();
  await knex('file_shares').del();
  await knex('printer_maintenance_logs').del();
  await knex('printer_user_assignments').del();
  await knex('printers').del();
  await knex('network_devices').del();
  await knex('antivirus_tracking').del();
  await knex('operating_systems').del();
  await knex('data_backups').del();
  await knex('scheduler_jobs').del();

  // 1. Roles
  const roles = [
    { id: 1, name: 'Super Admin', description: 'System Administrator with full access' },
    { id: 2, name: 'IT Manager', description: 'Manages IT assets, assignments, tickets, and reports' },
    { id: 3, name: 'IT Staff', description: 'Handles asset assignments and basic ticket operations' },
    { id: 4, name: 'Technician', description: 'Handles repair logs and ticket resolution' },
    { id: 5, name: 'Department Head', description: 'Views department reports and approves requests' },
    { id: 6, name: 'Employee', description: 'Standard employee; creates helpdesk tickets' },
    { id: 7, name: 'Auditor', description: 'Read-only access to logs and reports' }
  ];
  await knex('roles').insert(roles);

  // 2. Permissions
  const permissionsList = [
    // Dashboard
    { code: 'dashboard.view', name: 'View Dashboard', description: 'Allows viewing the statistics dashboard' },
    // Assets
    { code: 'assets.view', name: 'View Assets', description: 'Allows viewing asset lists and details' },
    { code: 'assets.create', name: 'Create Assets', description: 'Allows adding new IT assets' },
    { code: 'assets.update', name: 'Update Assets', description: 'Allows editing asset details' },
    { code: 'assets.delete', name: 'Delete Assets', description: 'Allows soft-deleting assets' },
    { code: 'assets.assign', name: 'Assign Assets', description: 'Allows assigning assets to employees/departments' },
    { code: 'assets.transfer', name: 'Transfer Assets', description: 'Allows transferring assets between locations' },
    { code: 'assets.return', name: 'Return Assets', description: 'Allows returning assets from custody' },
    // Tickets
    { code: 'tickets.view_all', name: 'View All Tickets', description: 'Allows viewing all ticket queues' },
    { code: 'tickets.view_own', name: 'View Own Tickets', description: 'Allows viewing own filed tickets' },
    { code: 'tickets.create', name: 'Create Tickets', description: 'Allows filing a new support ticket' },
    { code: 'tickets.assign', name: 'Assign Tickets', description: 'Allows assigning technicians to tickets' },
    { code: 'tickets.update', name: 'Update Tickets', description: 'Allows updating ticket progress and logs' },
    { code: 'tickets.close', name: 'Close Tickets', description: 'Allows resolving and closing support tickets' },
    // Repairs
    { code: 'repairs.view', name: 'View Repairs', description: 'Allows viewing hardware repair logs' },
    { code: 'repairs.create', name: 'Create Repairs', description: 'Allows logging new asset repairs' },
    { code: 'repairs.update', name: 'Update Repairs', description: 'Allows editing repair diagnostics and stages' },
    // Maintenance
    { code: 'maintenance.view', name: 'View Maintenance', description: 'Allows viewing preventive maintenance schedules' },
    { code: 'maintenance.create', name: 'Create Maintenance', description: 'Allows scheduling preventive maintenance routines' },
    { code: 'maintenance.complete', name: 'Complete Maintenance', description: 'Allows recording maintenance completion checks' },
    // Inventory
    { code: 'inventory.view', name: 'View Inventory', description: 'Allows viewing spare parts stock levels' },
    { code: 'inventory.receive', name: 'Receive Stock', description: 'Allows registering incoming spare parts stock' },
    { code: 'inventory.issue', name: 'Issue Stock', description: 'Allows issuing spare parts for repairs' },
    { code: 'inventory.adjust', name: 'Adjust Stock', description: 'Allows manual stock adjustments' },
    // Licenses
    { code: 'licenses.view', name: 'View Licenses', description: 'Allows viewing software license entries' },
    { code: 'licenses.create', name: 'Create Licenses', description: 'Allows adding new software licenses' },
    { code: 'licenses.update', name: 'Update Licenses', description: 'Allows editing license details/keys' },
    // Users
    { code: 'users.view', name: 'View Users', description: 'Allows viewing system users' },
    { code: 'users.create', name: 'Create Users', description: 'Allows creating new user profiles' },
    { code: 'users.update', name: 'Update Users', description: 'Allows editing user accounts and roles' },
    { code: 'users.disable', name: 'Disable Users', description: 'Allows deactivating or activating user accounts' },
    // Reports
    { code: 'reports.view', name: 'View Reports', description: 'Allows viewing analytical reports' },
    { code: 'reports.export', name: 'Export Reports', description: 'Allows exporting reports to Excel/PDF' },
    // Settings
    { code: 'settings.manage', name: 'Manage Settings', description: 'Allows changing system configurations' },
    // Audit Logs
    { code: 'audit_logs.view', name: 'View Audit Logs', description: 'Allows viewing system audit logs' },

    // ==========================================
    // NEW IT OPERATIONS HUB PERMISSIONS
    // ==========================================
    { code: 'backups.view', name: 'View Backups', description: 'Allows viewing backup compliance checklists' },
    { code: 'backups.create', name: 'Register Backups', description: 'Allows recording backup entries' },
    { code: 'backups.verify', name: 'Verify Backups', description: 'Allows signing off and verifying backup checksum integrity' },
    { code: 'endpoint_security.view', name: 'View Endpoint Security', description: 'Allows viewing OS builds and AV scanning compliance status' },
    { code: 'endpoint_security.manage', name: 'Manage Endpoint Security', description: 'Allows registering/updating OS builds and antivirus records' },
    { code: 'network.view', name: 'View Network Configs', description: 'Allows viewing network switches, APs, and centralized IP allocations' },
    { code: 'network.manage', name: 'Manage Network Configs', description: 'Allows configuring network devices, switch ports, and IP settings' },
    { code: 'printers.view', name: 'View Printers', description: 'Allows viewing printers, ink levels, and assignments' },
    { code: 'printers.manage', name: 'Manage Printers', description: 'Allows registering printers, mapping users, and recording maintenance logs' },
    { code: 'file_shares.view', name: 'View File Shares', description: 'Allows viewing company shared folders and department access levels' },
    { code: 'file_shares.manage', name: 'Manage File Shares', description: 'Allows registering file directories and modifying access control permissions' },
    { code: 'guest_wifi.view', name: 'View Guest WiFi', description: 'Allows viewing guest wifi account requests' },
    { code: 'guest_wifi.create', name: 'Create Guest WiFi', description: 'Allows generating temporary guest account logins' },
    { code: 'guest_wifi.disable', name: 'Disable Guest WiFi', description: 'Allows manually expiring or deactivating guest accounts' },
    { code: 'websites.view', name: 'View Websites', description: 'Allows viewing website domain monitoring and uptime checks' },
    { code: 'websites.manage', name: 'Manage Websites', description: 'Allows adding websites, editing check parameters, and hosting details' },
    { code: 'secrets.reveal', name: 'Reveal Cryptographic Secrets', description: 'Allows decrypting and viewing sensitive guest Wi-Fi passwords and software keys' }
  ];
  await knex('permissions').insert(permissionsList);

  // Get list of permissions to construct role mappings
  const dbPermissions = await knex('permissions').select('id', 'code');
  const permMap = {};
  dbPermissions.forEach(p => { permMap[p.code] = p.id; });

  // 3. Role Permissions Mapping
  const rolePermissions = [];

  // Super Admin gets all permissions via RBAC
  Object.values(permMap).forEach(permId => {
    rolePermissions.push({ role_id: 1, permission_id: permId });
  });

  // IT Manager permissions
  const managerPerms = [
    'dashboard.view', 'assets.view', 'assets.create', 'assets.update', 'assets.delete', 'assets.assign', 'assets.transfer', 'assets.return',
    'tickets.view_all', 'tickets.view_own', 'tickets.create', 'tickets.assign', 'tickets.update', 'tickets.close',
    'repairs.view', 'repairs.create', 'repairs.update',
    'maintenance.view', 'maintenance.create', 'maintenance.complete',
    'inventory.view', 'inventory.receive', 'inventory.issue', 'inventory.adjust',
    'licenses.view', 'licenses.create', 'licenses.update',
    'users.view', 'users.create', 'users.update',
    'reports.view', 'reports.export', 'settings.manage', 'audit_logs.view',
    'backups.view', 'backups.create', 'backups.verify',
    'endpoint_security.view', 'endpoint_security.manage',
    'network.view', 'network.manage',
    'printers.view', 'printers.manage',
    'file_shares.view', 'file_shares.manage',
    'guest_wifi.view', 'guest_wifi.create', 'guest_wifi.disable',
    'websites.view', 'websites.manage',
    'secrets.reveal'
  ];
  managerPerms.forEach(code => {
    if (permMap[code]) {
      rolePermissions.push({ role_id: 2, permission_id: permMap[code] });
    }
  });

  // IT Staff permissions
  const staffPerms = [
    'dashboard.view', 'assets.view', 'assets.create', 'assets.update', 'assets.assign', 'assets.transfer', 'assets.return',
    'tickets.view_all', 'tickets.view_own', 'tickets.create', 'tickets.assign', 'tickets.update', 'tickets.close',
    'repairs.view', 'repairs.create', 'repairs.update',
    'maintenance.view', 'maintenance.create', 'maintenance.complete',
    'inventory.view', 'inventory.receive', 'inventory.issue',
    'licenses.view', 'licenses.create', 'licenses.update',
    'reports.view',
    'backups.view', 'backups.create',
    'endpoint_security.view',
    'network.view',
    'printers.view',
    'file_shares.view',
    'guest_wifi.view', 'guest_wifi.create',
    'websites.view'
  ];
  staffPerms.forEach(code => {
    if (permMap[code]) {
      rolePermissions.push({ role_id: 3, permission_id: permMap[code] });
    }
  });

  // Technician permissions
  const techPerms = [
    'dashboard.view', 'assets.view',
    'tickets.view_all', 'tickets.view_own', 'tickets.update',
    'repairs.view', 'repairs.create', 'repairs.update',
    'maintenance.view', 'maintenance.complete',
    'inventory.view', 'inventory.issue',
    'endpoint_security.view',
    'network.view',
    'printers.view', 'printers.manage' // allows maintenance logging
  ];
  techPerms.forEach(code => {
    if (permMap[code]) {
      rolePermissions.push({ role_id: 4, permission_id: permMap[code] });
    }
  });

  // Department Head permissions
  const headPerms = [
    'dashboard.view', 'assets.view',
    'tickets.view_own', 'tickets.create', 'tickets.close',
    'reports.view'
  ];
  headPerms.forEach(code => {
    if (permMap[code]) {
      rolePermissions.push({ role_id: 5, permission_id: permMap[code] });
    }
  });

  // Employee permissions
  const empPerms = [
    'tickets.view_own', 'tickets.create'
  ];
  empPerms.forEach(code => {
    if (permMap[code]) {
      rolePermissions.push({ role_id: 6, permission_id: permMap[code] });
    }
  });

  // Auditor permissions
  const auditorPerms = [
    'dashboard.view', 'assets.view', 'tickets.view_all', 'repairs.view', 'maintenance.view', 'inventory.view', 'licenses.view',
    'reports.view', 'reports.export', 'audit_logs.view',
    'backups.view', 'endpoint_security.view', 'network.view', 'printers.view', 'file_shares.view', 'guest_wifi.view', 'websites.view'
  ];
  auditorPerms.forEach(code => {
    if (permMap[code]) {
      rolePermissions.push({ role_id: 7, permission_id: permMap[code] });
    }
  });

  await knex('role_permissions').insert(rolePermissions);

  // Seeding required Master Lookup Categories
  const assetCategories = [
    { id: 1, name: 'Desktop Computer', description: 'Workstation computers used in offices' },
    { id: 2, name: 'Laptop', description: 'Portable work computers' },
    { id: 3, name: 'Monitor', description: 'Display screens' },
    { id: 4, name: 'Printer', description: 'Paper printer and scanner multi-functional units' },
    { id: 5, name: 'Server', description: 'Data center server rack hardware' },
    { id: 6, name: 'Router', description: 'Network routing units' },
    { id: 7, name: 'Switch', description: 'Network switches' },
    { id: 8, name: 'UPS', description: 'Uninterruptible Power Supplies' },
    { id: 9, name: 'Other IT Equipment', description: 'General keyboards, mice, peripherals' }
  ];
  await knex('asset_categories').insert(assetCategories);

  const ticketCategories = [
    { id: 1, name: 'Hardware', description: 'Physical computer problems, damaged equipment' },
    { id: 2, name: 'Software', description: 'OS issues, software installations, license requests' },
    { id: 3, name: 'Network', description: 'Wifi disconnection, slow local network, IP conflicts' },
    { id: 4, name: 'Email', description: 'Mailbox configuration, password lockouts, forwarding' },
    { id: 5, name: 'Security', description: 'Antivirus alerts, spam/phishing reports' },
    { id: 6, name: 'Other', description: 'General inquiries and unclassified issues' }
  ];
  await knex('ticket_categories').insert(ticketCategories);

  const inventoryCategories = [
    { id: 1, name: 'Memory (RAM)', description: 'RAM chips for desktops and laptops' },
    { id: 2, name: 'Storage (SSD/HDD)', description: 'SATA and NVMe drives' },
    { id: 3, name: 'Cables & Peripherals', description: 'HDMI, Ethernet, USB cables, keyboards, mice' },
    { id: 4, name: 'Printer Supplies', description: 'Ink cartridges and toner drums' },
    { id: 5, name: 'Network Parts', description: 'RJ45 connectors, small transceivers' }
  ];
  await knex('inventory_categories').insert(inventoryCategories);

  // 4. Seeding Initial Super Admin ONLY
  const saltRounds = 10;
  const adminPasswordHash = await bcrypt.hash(process.env.INITIAL_SUPER_ADMIN_PASSWORD || 'AdminPassword123!', saltRounds);

  const initialAdminUser = {
    id: 1,
    username: process.env.INITIAL_SUPER_ADMIN_USERNAME || 'admin',
    password_hash: adminPasswordHash,
    email: process.env.INITIAL_SUPER_ADMIN_EMAIL || 'admin@nkb-itms.com',
    status: 'active',
    force_password_change: false
  };
  await knex('users').insert(initialAdminUser);

  // Bind role mapping
  await knex('user_roles').insert({ user_id: 1, role_id: 1 });

  // 5. System Settings
  const defaultSettings = [
    { key: 'company_name', value: 'NKB Technologies Inc.', description: 'Company legal name' },
    { key: 'company_logo', value: '', description: 'Path to company logo image' },
    { key: 'company_address', value: '123 Tech Loop, Fort Bonifacio, Taguig, Metro Manila, Philippines', description: 'Company main office address' },
    { key: 'company_contact', value: '+63 2 8123 4567', description: 'Company support phone number' },
    { key: 'company_email', value: 'support@nkb-tech.com', description: 'Company main support email' },
    { key: 'system_timezone', value: 'Asia/Manila', description: 'Default system timezone' },
    { key: 'system_date_format', value: 'YYYY-MM-DD', description: 'Standard date format display' },
    { key: 'system_currency', value: 'PHP', description: 'Standard currency ISO code' }
  ];
  await knex('system_settings').insert(defaultSettings);

  // 6. Number Sequences (Production baseline set to 0)
  const defaultSequences = [
    { module: 'Asset', prefix: 'AST-2026-', last_number: 0, length: 6 },
    { module: 'Ticket', prefix: 'TKT-2026-', last_number: 0, length: 6 },
    { module: 'Assignment', prefix: 'ASN-2026-', last_number: 0, length: 6 },
    { module: 'Repair', prefix: 'REP-2026-', last_number: 0, length: 6 },
    { module: 'Maintenance', prefix: 'PM-2026-', last_number: 0, length: 6 },
    { module: 'Inventory', prefix: 'INV-2026-', last_number: 0, length: 6 }
  ];
  await knex('number_sequences').insert(defaultSequences);

  // 7. Seed scheduler task baselines
  const schedulerBaselines = [
    { name: 'website_uptime', is_locked: false, attempt_count: 0 },
    { name: 'backup_compliance', is_locked: false, attempt_count: 0 },
    { name: 'antivirus_expiry', is_locked: false, attempt_count: 0 },
    { name: 'software_licenses_expiry', is_locked: false, attempt_count: 0 },
    { name: 'os_support_expiry', is_locked: false, attempt_count: 0 },
    { name: 'preventive_maintenance_expiry', is_locked: false, attempt_count: 0 },
    { name: 'guest_wifi_expiry', is_locked: false, attempt_count: 0 }
  ];
  await knex('scheduler_jobs').insert(schedulerBaselines);

  if (knex.client.config.client === 'sqlite3') {
    await knex.raw('PRAGMA foreign_keys = ON;');
  } else {
    await knex.raw('SET FOREIGN_KEY_CHECKS = 1;');
  }
};
