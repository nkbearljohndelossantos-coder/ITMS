const bcrypt = require('bcrypt');

exports.seed = async function(knex) {
  if (knex.client.config.client === 'sqlite3') {
    await knex.raw('PRAGMA foreign_keys = OFF;');
  } else {
    await knex.raw('SET FOREIGN_KEY_CHECKS = 0;');
  }
  // Check if we are running in development or testing
  // Ensure we delete any existing demo logs safely before executing
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

  await knex('license_assignments').del();
  await knex('software_licenses').del();
  await knex('inventory_transactions').del();
  await knex('maintenance_results').del();
  await knex('maintenance_checklists').del();
  await knex('maintenance_schedules').del();
  await knex('repair_parts').del();
  await knex('repairs').del();
  await knex('inventory_items').del();
  await knex('tickets').del();
  await knex('asset_assignments').del();
  await knex('asset_history').del();
  await knex('assets').del();
  await knex('employees').del();
  await knex('positions').del();
  await knex('departments').del();
  
  // Since we also want standard operational users in demo, let's delete secondary users
  await knex('user_roles').whereNot('user_id', 1).del();
  await knex('users').whereNot('id', 1).del();

  // 1. Mapped Departments
  const departments = [
    { id: 1, code: 'ITD', name: 'Information Technology Department', location: '4th Floor, Main Building', description: 'Handles IT support and systems management', status: 'active' },
    { id: 2, code: 'HRD', name: 'Human Resources Department', location: '2nd Floor, Main Building', description: 'Handles recruitment and employee relations', status: 'active' },
    { id: 3, code: 'FND', name: 'Finance & Accounting Department', location: '3rd Floor, Annex Building', description: 'Handles payroll and accounting operations', status: 'active' },
    { id: 4, code: 'OPS', name: 'Operations Department', location: 'Ground Floor, Warehouse B', description: 'Handles daily distribution and logistics', status: 'active' },
    { id: 5, code: 'SLS', name: 'Sales & Marketing Department', location: '5th Floor, Main Building', description: 'Handles clients, advertising and revenue generation', status: 'active' }
  ];
  await knex('departments').insert(departments);

  // 2. Mapped Positions
  const positions = [
    { id: 1, name: 'IT Infrastructure Manager', description: 'Oversees IT hardware and systems' },
    { id: 2, name: 'Senior IT Specialist', description: 'Handles server administration and high level support' },
    { id: 3, name: 'Desktop Support Tech', description: 'Provides end-user desktop and hardware troubleshooting' },
    { id: 4, name: 'HR Manager', description: 'Manages HR operations' },
    { id: 5, name: 'Financial Accountant', description: 'Handles corporate taxes and general ledger' },
    { id: 6, name: 'Operations Supervisor', description: 'Manages warehouses and shipping' },
    { id: 7, name: 'Sales representative', description: 'Drives product sales' }
  ];
  await knex('positions').insert(positions);

  // 3. Mapped Employees
  const employees = [
    { id: 1, employee_number: 'EMP-2026-0001', first_name: 'John', middle_name: 'William', last_name: 'Doe', email: 'admin@nkb-itms.com', phone: '+639171234567', position_id: 2, department_id: 1, employment_status: 'Regular', date_hired: '2020-01-15', status: 'active' },
    { id: 2, employee_number: 'EMP-2026-0002', first_name: 'Jane', middle_name: 'Marie', last_name: 'Smith', email: 'itmanager@nkb-itms.com', phone: '+639171234568', position_id: 1, department_id: 1, employment_status: 'Regular', date_hired: '2019-06-01', status: 'active' },
    { id: 3, employee_number: 'EMP-2026-0003', first_name: 'Alice', middle_name: 'V', last_name: 'Stafford', email: 'itstaff@nkb-itms.com', phone: '+639171234569', position_id: 3, department_id: 1, employment_status: 'Regular', date_hired: '2023-02-15', status: 'active' },
    { id: 4, employee_number: 'EMP-2026-0004', first_name: 'Bob', middle_name: 'T', last_name: 'Repairman', email: 'tech@nkb-itms.com', phone: '+639171234570', position_id: 3, department_id: 1, employment_status: 'Contractual', date_hired: '2024-03-01', status: 'active' },
    { id: 5, employee_number: 'EMP-2026-0005', first_name: 'Charlie', middle_name: 'Brown', last_name: 'Executive', email: 'head@nkb-itms.com', phone: '+639171234571', position_id: 4, department_id: 2, employment_status: 'Regular', date_hired: '2015-11-20', status: 'active' },
    { id: 6, employee_number: 'EMP-2026-0006', first_name: 'David', middle_name: 'Lee', last_name: 'Employee', email: 'emp@nkb-itms.com', phone: '+639171234572', position_id: 7, department_id: 5, employment_status: 'Regular', date_hired: '2025-05-10', status: 'active' }
  ];
  await knex('employees').insert(employees);

  // Link Dept Head
  await knex('departments').where('id', 1).update({ department_head_employee_id: 2 });
  await knex('departments').where('id', 2).update({ department_head_employee_id: 5 });

  // 4. Mapped Secondary Users for demo purposes
  const saltRounds = 10;
  const userPasswordHash = await bcrypt.hash('Employee123!', saltRounds);

  const demoUsers = [
    { id: 2, username: 'itmanager', password_hash: userPasswordHash, email: 'itmanager@nkb-itms.com', status: 'active', force_password_change: false },
    { id: 3, username: 'itstaff', password_hash: userPasswordHash, email: 'itstaff@nkb-itms.com', status: 'active', force_password_change: false },
    { id: 4, username: 'technician', password_hash: userPasswordHash, email: 'tech@nkb-itms.com', status: 'active', force_password_change: false },
    { id: 5, username: 'depthead', password_hash: userPasswordHash, email: 'head@nkb-itms.com', status: 'active', force_password_change: false },
    { id: 6, username: 'employee', password_hash: userPasswordHash, email: 'emp@nkb-itms.com', status: 'active', force_password_change: false },
    { id: 7, username: 'auditor', password_hash: userPasswordHash, email: 'auditor@nkb-itms.com', status: 'active', force_password_change: false }
  ];
  await knex('users').insert(demoUsers);

  const demoRoles = [
    { user_id: 2, role_id: 2 },
    { user_id: 3, role_id: 3 },
    { user_id: 4, role_id: 4 },
    { user_id: 5, role_id: 5 },
    { user_id: 6, role_id: 6 },
    { user_id: 7, role_id: 7 }
  ];
  await knex('user_roles').insert(demoRoles);

  // 5. Sample Assets
  const demoAssets = [
    { id: 1, asset_code: 'AST-2026-000001', qr_code: 'AST-2026-000001', barcode: 'AST-2026-000001', name: 'Jane\'s ThinkPad L14', category_id: 2, brand: 'Lenovo', model: 'ThinkPad L14 Gen 4', serial_number: 'R90X812Z', description: 'Workstation laptop for IT Manager', specs_cpu: 'Intel Core i7-1355U', specs_ram: '16GB DDR4', specs_storage: '512GB NVMe SSD', specs_os: 'Windows 11 Pro', specs_win_edition: '23H2', hostname: 'NKB-IT-MGR-L01', mac_address: 'E4:A8:DF:12:34:56', ip_address: '192.168.10.155', purchase_date: '2026-01-05', purchase_price: 52000.00, supplier: 'PC Express', invoice_number: 'PCE-778901', warranty_start_date: '2026-01-05', warranty_end_date: '2029-01-05', department_id: 1, employee_id: 2, current_location: 'IT Office', condition: 'Good', status: 'Assigned', created_by: 1 }
  ];
  await knex('assets').insert(demoAssets);

  // Seed IP allocation for Jane's asset
  await knex('ip_allocations').insert({
    ip_address: '192.168.10.155',
    mac_address: 'E4:A8:DF:12:34:56',
    vlan: '10',
    subnet: '255.255.255.0',
    gateway: '192.168.10.1',
    asset_id: 1,
    assignment_type: 'User Assignment',
    status: 'Active'
  });

  // Seed OS activation details
  await knex('operating_systems').insert({
    asset_id: 1,
    edition: 'Windows 11 Pro',
    build_version: '23H2 (Build 22631.3447)',
    license_type: 'OEM',
    activation_status: 'Activated',
    last_activation_check_at: new Date(),
    activation_details: 'Licensed via digital OEM license key stored in firmware BIOS.',
    product_key_ciphertext: 'U2FsdGVkX19P19qG3f9g8h+J2n748yJ1h0PqR3i4=', // Sample encrypted key
    product_key_iv: '0123456789abcdef',
    product_key_tag: 'abcdef0123456789',
    product_key_version: 'v1',
    last_update_date: '2026-06-15',
    end_of_support_date: '2031-10-14'
  });

  // Seed Antivirus
  await knex('antivirus_tracking').insert({
    asset_id: 1,
    antivirus_name: 'Sophos Endpoint Protection',
    version: '10.8.4',
    license_key_ciphertext: 'U2FsdGVkX19P19qG3f9g8h+J2n748yJ1h0PqR3i5=',
    license_key_iv: '0123456789abcdef',
    license_key_tag: 'abcdef0123456789',
    license_key_version: 'v1',
    expiration_date: '2027-01-15',
    last_scan_date: '2026-07-17',
    scan_result: 'Clean'
  });

  // Seed network switch device
  await knex('network_devices').insert({
    id: 1,
    device_name: 'IT Core Switch Cisco SG350',
    device_type: 'Switch',
    brand: 'Cisco Systems',
    model: 'SG350-28P-K9',
    status: 'Online',
    remarks: 'Core gigabit switch mapping floor nodes'
  });

  await knex('ip_allocations').insert({
    ip_address: '192.168.10.2',
    mac_address: '00:1B:44:11:3A:B7',
    vlan: '10',
    subnet: '255.255.255.0',
    gateway: '192.168.10.1',
    network_device_id: 1,
    assignment_type: 'Network Device',
    status: 'Active'
  });

  // Seed Printer
  await knex('printers').insert({
    id: 1,
    printer_name: 'IT HP LaserJet MFP',
    brand: 'HP',
    model: 'LaserJet Pro M428fdw',
    location: '4th Floor IT Admin Desk',
    department_id: 1,
    toner_model: 'CF258A HP 58A Black',
    ink_level: 80,
    status: 'Online',
    remarks: 'Shared network scanner printer'
  });

  await knex('ip_allocations').insert({
    ip_address: '192.168.10.250',
    mac_address: '88:D7:F6:41:2B:E9',
    vlan: '10',
    subnet: '255.255.255.0',
    gateway: '192.168.10.1',
    printer_id: 1,
    assignment_type: 'Printer',
    status: 'Active'
  });

  // Seed Printer access mapping
  await knex('printer_user_assignments').insert({
    printer_id: 1,
    employee_id: 2
  });

  // Seed file share
  await knex('file_shares').insert({
    id: 1,
    folder_name: 'IT Shared Assets Documents',
    server_location: '\\\\it-fileserver-01\\docs',
    owner_employee_id: 2,
    purpose: 'Stores catalog datasheets and licensing manuals'
  });

  await knex('file_share_permissions').insert({
    file_share_id: 1,
    department_id: 1,
    access_level: 'Read/Write'
  });

  // Seed backup logs
  await knex('data_backups').insert({
    name: 'IT Weekly VM Snapshot Backup',
    backup_location: 'AWS Glacier S3 Storage',
    backup_type: 'Full',
    status: 'Success',
    backup_size_gb: 420.50,
    backup_date: '2026-07-15',
    next_due_date: '2026-07-22',
    verification_status: 'Verified',
    verified_by_user_id: 1,
    verified_at: new Date(),
    checksum: 'a2b3c4d5e6f7g8h9i0j1',
    restore_test_result: 'VM started successfully inside sandbox hypervisor, check logs verified.',
    backup_file_count: 3
  });

  // Seed website monitor
  await knex('website_monitoring').insert({
    id: 1,
    name: 'NKB Corporate Landing Page',
    domain: 'https://nkb-tech.com',
    hosting_provider: 'Hostinger VPS Plan 4',
    domain_expiration_date: '2027-04-12',
    ssl_expiration_date: '2026-10-10',
    dns_info: 'NS1.HOSTINGER.COM, NS2.HOSTINGER.COM',
    admin_employee_id: 2,
    status: 'Active',
    last_checked_at: new Date(),
    response_time_ms: 245,
    http_status_code: 200,
    ssl_valid: true
  });

  await knex('website_uptime_logs').insert({
    website_id: 1,
    checked_at: new Date(),
    response_time_ms: 245,
    http_status_code: 200,
    ssl_valid: true,
    status: 'Up'
  });

  // Update numbers sequence pointers
  await knex('number_sequences').where('module', 'Asset').update({ last_number: 1 });
  await knex('number_sequences').where('module', 'Assignment').update({ last_number: 1 });
  await knex('number_sequences').where('module', 'Inventory').update({ last_number: 4 });
};
