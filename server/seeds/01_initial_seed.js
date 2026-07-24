const bcrypt = require('bcrypt');

exports.seed = async function(knex) {
  const isSqlite = knex.client.config.client === 'sqlite3';
  if (isSqlite) {
    await knex.raw('PRAGMA foreign_keys = OFF;');
  } else {
    await knex.raw('SET FOREIGN_KEY_CHECKS = 0;');
  }

  // Check if roles table is already populated (if populated, do not wipe user data!)
  const [{ count }] = await knex('roles').count('* as count');
  if (parseInt(count) > 0) {
    console.log('Database already initialized. Skipping destructive initial seed to protect user data.');
    if (isSqlite) {
      await knex.raw('PRAGMA foreign_keys = ON;');
    } else {
      await knex.raw('SET FOREIGN_KEY_CHECKS = 1;');
    }
    return;
  }

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
    { code: 'dashboard.view', name: 'View Dashboard', description: 'Allows viewing the statistics dashboard' },
    { code: 'assets.view', name: 'View Assets', description: 'Allows viewing asset lists and details' },
    { code: 'assets.create', name: 'Create Assets', description: 'Allows adding new IT assets' },
    { code: 'assets.update', name: 'Update Assets', description: 'Allows editing asset details' },
    { code: 'assets.delete', name: 'Delete Assets', description: 'Allows soft-deleting assets' },
    { code: 'assets.assign', name: 'Assign Assets', description: 'Allows assigning assets to employees/departments' },
    { code: 'assets.transfer', name: 'Transfer Assets', description: 'Allows transferring assets between locations' },
    { code: 'assets.return', name: 'Return Assets', description: 'Allows returning assets from custody' },
    { code: 'tickets.view_all', name: 'View All Tickets', description: 'Allows viewing all ticket queues' },
    { code: 'tickets.view_own', name: 'View Own Tickets', description: 'Allows viewing own filed tickets' },
    { code: 'tickets.create', name: 'Create Tickets', description: 'Allows filing a new support ticket' },
    { code: 'tickets.assign', name: 'Assign Tickets', description: 'Allows assigning technicians to tickets' },
    { code: 'tickets.update', name: 'Update Tickets', description: 'Allows updating ticket progress and logs' },
    { code: 'tickets.close', name: 'Close Tickets', description: 'Allows resolving and closing support tickets' },
    { code: 'repairs.view', name: 'View Repairs', description: 'Allows viewing hardware repair logs' },
    { code: 'repairs.create', name: 'Create Repairs', description: 'Allows logging new asset repairs' },
    { code: 'repairs.update', name: 'Update Repairs', description: 'Allows editing repair diagnostics and stages' },
    { code: 'maintenance.view', name: 'View Maintenance', description: 'Allows viewing preventive maintenance schedules' },
    { code: 'maintenance.create', name: 'Create Maintenance', description: 'Allows scheduling preventive maintenance routines' },
    { code: 'maintenance.complete', name: 'Complete Maintenance', description: 'Allows recording maintenance completion checks' },
    { code: 'inventory.view', name: 'View Inventory', description: 'Allows viewing spare parts stock levels' },
    { code: 'inventory.receive', name: 'Receive Stock', description: 'Allows registering incoming spare parts stock' },
    { code: 'inventory.issue', name: 'Issue Stock', description: 'Allows issuing spare parts for repairs' },
    { code: 'inventory.adjust', name: 'Adjust Stock', description: 'Allows manual stock adjustments' },
    { code: 'licenses.view', name: 'View Licenses', description: 'Allows viewing software license entries' },
    { code: 'licenses.create', name: 'Create Licenses', description: 'Allows adding new software licenses' },
    { code: 'licenses.update', name: 'Update Licenses', description: 'Allows editing license details/keys' },
    { code: 'users.view', name: 'View Users', description: 'Allows viewing system users' },
    { code: 'users.create', name: 'Create Users', description: 'Allows creating new user profiles' },
    { code: 'users.update', name: 'Update Users', description: 'Allows editing user accounts and roles' },
    { code: 'users.disable', name: 'Disable Users', description: 'Allows deactivating or activating user accounts' },
    { code: 'reports.view', name: 'View Reports', description: 'Allows viewing analytical reports' },
    { code: 'reports.export', name: 'Export Reports', description: 'Allows exporting reports to Excel/PDF' },
    { code: 'settings.manage', name: 'Manage Settings', description: 'Allows changing system configurations' },
    { code: 'audit_logs.view', name: 'View Audit Logs', description: 'Allows viewing system audit logs' },
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

  const dbPermissions = await knex('permissions').select('id', 'code');
  const permMap = {};
  dbPermissions.forEach(p => { permMap[p.code] = p.id; });

  // Role permissions
  const rolePermissions = [];
  Object.values(permMap).forEach(permId => {
    rolePermissions.push({ role_id: 1, permission_id: permId });
  });
  await knex('role_permissions').insert(rolePermissions);

  // Asset Categories
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

  // Default Admin User
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
  await knex('user_roles').insert({ user_id: 1, role_id: 1 });

  // System Settings
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

  // Number Sequences
  const defaultSequences = [
    { module: 'Asset', prefix: 'AST-2026-', last_number: 0, length: 6 },
    { module: 'Ticket', prefix: 'TKT-2026-', last_number: 0, length: 6 },
    { module: 'Assignment', prefix: 'ASN-2026-', last_number: 0, length: 6 },
    { module: 'Repair', prefix: 'REP-2026-', last_number: 0, length: 6 },
    { module: 'Maintenance', prefix: 'PM-2026-', last_number: 0, length: 6 },
    { module: 'Inventory', prefix: 'INV-2026-', last_number: 0, length: 6 }
  ];
  await knex('number_sequences').insert(defaultSequences);

  if (isSqlite) {
    await knex.raw('PRAGMA foreign_keys = ON;');
  } else {
    await knex.raw('SET FOREIGN_KEY_CHECKS = 1;');
  }
};
