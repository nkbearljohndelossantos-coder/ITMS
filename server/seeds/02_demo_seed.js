const bcrypt = require('bcrypt');

exports.seed = async function(knex) {
  const isSqlite = knex.client.config.client === 'sqlite3';
  if (isSqlite) {
    await knex.raw('PRAGMA foreign_keys = OFF;');
  } else {
    await knex.raw('SET FOREIGN_KEY_CHECKS = 0;');
  }

  // Clear demo operational tables
  await knex('asset_assignments').del();
  await knex('asset_history').del();
  await knex('asset_documents').del();
  await knex('assets').del();
  await knex('tickets').del();
  await knex('ticket_comments').del();
  await knex('ticket_history').del();
  await knex('inventory_items').del();
  await knex('inventory_transactions').del();
  await knex('repairs').del();
  await knex('repair_parts').del();
  await knex('software_licenses').del();
  await knex('license_assignments').del();
  await knex('maintenance_schedules').del();
  await knex('employees').del();

  // 1. Employees
  const employees = [
    {
      id: 1,
      employee_number: 'EMP-2026-0001',
      first_name: 'Earl John',
      last_name: 'Delos Santos',
      email: 'earl.delossantos@nkb-tech.com',
      phone: '+63 917 123 4567',
      department_id: 1,
      position_id: 1,
      employment_status: 'Regular',
      date_hired: '2022-03-15',
      status: 'active'
    },
    {
      id: 2,
      employee_number: 'EMP-2026-0002',
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane.doe@nkb-tech.com',
      phone: '+63 918 234 5678',
      department_id: 2,
      position_id: 3,
      employment_status: 'Regular',
      date_hired: '2023-01-10',
      status: 'active'
    },
    {
      id: 3,
      employee_number: 'EMP-2026-0003',
      first_name: 'Mark',
      last_name: 'Reyes',
      email: 'mark.reyes@nkb-tech.com',
      phone: '+63 919 345 6789',
      department_id: 3,
      position_id: 4,
      employment_status: 'Regular',
      date_hired: '2021-07-01',
      status: 'active'
    },
    {
      id: 4,
      employee_number: 'EMP-2026-0004',
      first_name: 'Sarah',
      last_name: 'Cruz',
      email: 'sarah.cruz@nkb-tech.com',
      phone: '+63 920 456 7890',
      department_id: 4,
      position_id: 5,
      employment_status: 'Regular',
      date_hired: '2020-11-20',
      status: 'active'
    },
    {
      id: 5,
      employee_number: 'EMP-2026-0005',
      first_name: 'Michael',
      last_name: 'Tan',
      email: 'michael.tan@nkb-tech.com',
      phone: '+63 921 567 8901',
      department_id: 1,
      position_id: 2,
      employment_status: 'Regular',
      date_hired: '2024-02-01',
      status: 'active'
    }
  ];
  await knex('employees').insert(employees);

  // 2. Assets
  const assets = [
    {
      id: 1,
      asset_code: 'PPE-2026-0087',
      qr_code: 'NKB-ITMS:ASSET:PPE-2026-0087',
      barcode: 'PPE-2026-0087',
      name: 'PRO 14 PC14250',
      category_id: 2,
      brand: 'Lenovo',
      model: 'ThinkPad Pro 14 PC14250',
      serial_number: '7Y2SGB4',
      description: 'High-performance workstations laptop assigned to IT Operations',
      specs_cpu: 'Intel Core i7-1355U',
      specs_ram: '16GB DDR4',
      specs_storage: '512GB NVMe SSD',
      specs_os: 'Windows 11 Pro',
      specs_win_edition: '23H2',
      hostname: 'NKB-PRO14-087',
      mac_address: '74:56:3C:99:A1:B2',
      ip_address: '192.168.10.105',
      purchase_date: '2026-02-10',
      purchase_price: 58500.00,
      supplier: 'Lenovo Philippines Direct',
      invoice_number: 'INV-LN-2026-981',
      warranty_start_date: '2026-02-10',
      warranty_end_date: '2029-02-10',
      department_id: 1,
      employee_id: 1,
      current_location: 'Nkb Manufacturing Sampaguita Village 2, Mambog 2, B4 L5, Twig St, Bacoor, 4102 Cavite',
      condition: 'Good',
      status: 'Assigned',
      remarks: 'Primary IT Admin Workstation',
      created_by: 1
    },
    {
      id: 2,
      asset_code: 'AST-2026-000001',
      qr_code: 'NKB-ITMS:ASSET:AST-2026-000001',
      barcode: 'AST-2026-000001',
      name: 'Dell Latitude 5430',
      category_id: 2,
      brand: 'Dell',
      model: 'Latitude 5430',
      serial_number: 'DL5430-99A8',
      description: 'Corporate laptop assigned to HR Department',
      specs_cpu: 'Intel Core i5-1245U',
      specs_ram: '16GB DDR4',
      specs_storage: '256GB NVMe SSD',
      specs_os: 'Windows 11 Pro',
      specs_win_edition: '22H2',
      hostname: 'NKB-HR-LAP01',
      mac_address: '00:1A:2B:3C:4D:5E',
      ip_address: '192.168.10.112',
      purchase_date: '2026-01-15',
      purchase_price: 45000.00,
      supplier: 'Dell Enterprise PH',
      invoice_number: 'INV-DELL-5521',
      warranty_start_date: '2026-01-15',
      warranty_end_date: '2028-01-15',
      department_id: 2,
      employee_id: 2,
      current_location: 'HR Office - 2nd Floor',
      condition: 'Good',
      status: 'Assigned',
      remarks: 'Standard HR laptop',
      created_by: 1
    },
    {
      id: 3,
      asset_code: 'AST-2026-000002',
      qr_code: 'NKB-ITMS:ASSET:AST-2026-000002',
      barcode: 'AST-2026-000002',
      name: 'HP LaserJet Pro M404dn',
      category_id: 4,
      brand: 'HP',
      model: 'LaserJet Pro M404dn',
      serial_number: 'HPLJ-88412X',
      description: 'Shared monochrome office network printer',
      specs_cpu: '1200 MHz',
      specs_ram: '256MB',
      specs_storage: 'Built-in Flash',
      specs_os: 'HP Jetdirect Firmware',
      specs_win_edition: 'N/A',
      hostname: 'NKB-PRINT-FINANCE',
      mac_address: 'D8:9E:F3:11:22:33',
      ip_address: '192.168.10.200',
      purchase_date: '2025-11-20',
      purchase_price: 18500.00,
      supplier: 'Octagon Computer Superstore',
      invoice_number: 'INV-OCT-3312',
      warranty_start_date: '2025-11-20',
      warranty_end_date: '2027-11-20',
      department_id: 3,
      employee_id: null,
      current_location: 'Finance & Accounting Hub',
      condition: 'Good',
      status: 'Available',
      remarks: 'Shared network printer',
      created_by: 1
    },
    {
      id: 4,
      asset_code: 'AST-2026-000003',
      qr_code: 'NKB-ITMS:ASSET:AST-2026-000003',
      barcode: 'AST-2026-000003',
      name: 'MacBook Pro 16"',
      category_id: 2,
      brand: 'Apple',
      model: 'MacBook Pro 16 M2 Pro',
      serial_number: 'C02G1234MD6R',
      description: 'High-end developer & admin laptop',
      specs_cpu: 'Apple M2 Pro (12-core)',
      specs_ram: '32GB Unified',
      specs_storage: '1TB NVMe SSD',
      specs_os: 'macOS',
      specs_win_edition: 'Sonoma 14.5',
      hostname: 'NKB-MAC-ADMIN',
      mac_address: 'A4:83:E7:77:88:99',
      ip_address: '192.168.10.150',
      purchase_date: '2026-03-01',
      purchase_price: 145000.00,
      supplier: 'Beyond the Box',
      invoice_number: 'BTB-99812',
      warranty_start_date: '2026-03-01',
      warranty_end_date: '2029-03-01',
      department_id: 1,
      employee_id: 5,
      current_location: 'IT Operations Room',
      condition: 'New',
      status: 'Assigned',
      remarks: 'Issued to Lead Systems Administrator',
      created_by: 1
    },
    {
      id: 5,
      asset_code: 'AST-2026-000004',
      qr_code: 'NKB-ITMS:ASSET:AST-2026-000004',
      barcode: 'AST-2026-000004',
      name: 'Dell UltraSharp 27 4K Monitor',
      category_id: 3,
      brand: 'Dell',
      model: 'U2723QE',
      serial_number: 'CN-0V4822-72872',
      description: '4K IPS USB-C Hub Monitor for workstation setup',
      specs_cpu: 'N/A',
      specs_ram: 'N/A',
      specs_storage: 'N/A',
      specs_os: 'Hardware Monitor',
      specs_win_edition: 'N/A',
      hostname: 'N/A',
      mac_address: 'N/A',
      ip_address: 'N/A',
      purchase_date: '2026-02-12',
      purchase_price: 28000.00,
      supplier: 'Dell Enterprise PH',
      invoice_number: 'INV-DELL-5522',
      warranty_start_date: '2026-02-12',
      warranty_end_date: '2029-02-12',
      department_id: 1,
      employee_id: 1,
      current_location: 'IT Office Desk 01',
      condition: 'Good',
      status: 'Assigned',
      remarks: 'Paired with PRO 14 laptop',
      created_by: 1
    }
  ];
  await knex('assets').insert(assets);

  // 3. Asset Assignments
  const assignments = [
    {
      id: 1,
      assignment_number: 'ASN-2026-000001',
      asset_id: 1,
      employee_id: 1,
      department_id: 1,
      date_assigned: '2026-02-10',
      expected_return_date: null,
      release_condition: 'Brand New',
      remarks: 'Issued for IT Management & Administration',
      status: 'Active',
      issued_by: 1
    },
    {
      id: 2,
      assignment_number: 'ASN-2026-000002',
      asset_id: 2,
      employee_id: 2,
      department_id: 2,
      date_assigned: '2026-01-15',
      expected_return_date: null,
      release_condition: 'Good',
      remarks: 'Issued to HR Manager',
      status: 'Active',
      issued_by: 1
    },
    {
      id: 3,
      assignment_number: 'ASN-2026-000003',
      asset_id: 4,
      employee_id: 5,
      department_id: 1,
      date_assigned: '2026-03-01',
      expected_return_date: null,
      release_condition: 'Brand New',
      remarks: 'Issued for Lead Systems Administrator',
      status: 'Active',
      issued_by: 1
    }
  ];
  await knex('asset_assignments').insert(assignments);

  // 4. Inventory Items
  const inventoryItems = [
    {
      id: 1,
      item_code: 'INV-RAM-16G',
      name: 'Kingston 16GB DDR4 3200MHz RAM',
      category_id: 1,
      brand: 'Kingston',
      model: 'DDR4 3200MHz',
      unit_of_measure: 'pcs',
      current_quantity: 25,
      minimum_stock: 5,
      reorder_quantity: 10,
      unit_cost: 2450.00,
      remarks: 'Desktop and workstation RAM upgrade module'
    },
    {
      id: 2,
      item_code: 'INV-SSD-500G',
      name: 'Samsung 980 500GB NVMe M.2 SSD',
      category_id: 2,
      brand: 'Samsung',
      model: '980 NVMe 500GB',
      unit_of_measure: 'pcs',
      current_quantity: 14,
      minimum_stock: 4,
      reorder_quantity: 10,
      unit_cost: 3800.00,
      remarks: 'High-speed solid state drive for OS upgrades'
    },
    {
      id: 3,
      item_code: 'INV-TNR-HP58A',
      name: 'HP 58A Black LaserJet Toner Cartridge',
      category_id: 4,
      brand: 'HP',
      model: '58A (CF258A)',
      unit_of_measure: 'pcs',
      current_quantity: 8,
      minimum_stock: 2,
      reorder_quantity: 5,
      unit_cost: 5200.00,
      remarks: 'Original toner cartridge for HP LaserJet M404 series'
    },
    {
      id: 4,
      item_code: 'INV-CBL-CAT6-2M',
      name: 'Cat6 UTP Ethernet Cable 2 Meters',
      category_id: 3,
      brand: 'AMP Netconnect',
      model: 'Cat6 UTP 2m',
      unit_of_measure: 'pcs',
      current_quantity: 50,
      minimum_stock: 10,
      reorder_quantity: 25,
      unit_cost: 150.00,
      remarks: 'Patch cable for office network drops'
    }
  ];
  await knex('inventory_items').insert(inventoryItems);

  // 5. Software Licenses
  const softwareLicenses = [
    {
      id: 1,
      name: 'Microsoft 365 Business Premium',
      vendor: 'Microsoft',
      license_type: 'Subscription',
      product_key_encrypted: 'XXXXX-XXXXX-XXXXX-XXXXX-M365P',
      seats_total: 50,
      seats_used: 32,
      purchase_date: '2026-01-01',
      expiration_date: '2027-01-01',
      purchase_cost: 450000.00,
      status: 'Active',
      remarks: 'Annual subscription for all office staff'
    },
    {
      id: 2,
      name: 'Adobe Creative Cloud All Apps',
      vendor: 'Adobe Systems',
      license_type: 'Subscription',
      product_key_encrypted: 'ADBE-CC-2026-VIP-9912',
      seats_total: 10,
      seats_used: 8,
      purchase_date: '2026-02-15',
      expiration_date: '2027-02-15',
      purchase_cost: 180000.00,
      status: 'Active',
      remarks: 'Marketing and Graphics Design team licenses'
    },
    {
      id: 3,
      name: 'Sophos Intercept X Endpoint Protection',
      vendor: 'Sophos',
      license_type: 'Subscription',
      product_key_encrypted: 'SPHS-EP-100S-2026',
      seats_total: 100,
      seats_used: 85,
      purchase_date: '2026-01-10',
      expiration_date: '2027-01-10',
      purchase_cost: 120000.00,
      status: 'Active',
      remarks: 'Centralized Endpoint Antivirus protection'
    }
  ];
  await knex('software_licenses').insert(softwareLicenses);

  // 6. Tickets
  const tickets = [
    {
      id: 1,
      ticket_number: 'TKT-2026-000001',
      requested_by_employee_id: 2,
      department_id: 2,
      category_id: 1,
      subject: 'Keyboard key stuck on ThinkPad Laptop',
      description: 'The "Spacebar" key on HR laptop feels sticky and misses keypresses.',
      priority: 'Medium',
      status: 'Open',
      assigned_technician_id: 1,
      created_at: '2026-07-20 09:30:00'
    },
    {
      id: 2,
      ticket_number: 'TKT-2026-000002',
      requested_by_employee_id: 3,
      department_id: 3,
      category_id: 1,
      subject: 'Finance printer printing blank pages',
      description: 'HP LaserJet M404dn printer in Finance prints blank pages during check runs.',
      priority: 'High',
      status: 'In Progress',
      assigned_technician_id: 1,
      created_at: '2026-07-22 14:15:00'
    }
  ];
  await knex('tickets').insert(tickets);

  // 7. Repairs
  const repairs = [
    {
      id: 1,
      repair_number: 'REP-2026-000001',
      asset_id: 2,
      ticket_id: 1,
      date_received: '2026-06-10',
      reported_issue: 'Laptop battery drainage issue',
      diagnosis: 'Battery degradation - cell capacity below 40%',
      repair_action: 'Replaced internal battery unit with genuine Dell spare battery.',
      technician_id: 1,
      parts_cost: 3500.00,
      labor_cost: 0.00,
      external_service_cost: 0.00,
      total_repair_cost: 3500.00,
      repair_start_date: '2026-06-10',
      repair_completion_date: '2026-06-12',
      status: 'Completed'
    }
  ];
  await knex('repairs').insert(repairs);

  // Update Number Sequences
  await knex('number_sequences').where({ module: 'Asset' }).update({ last_number: 5 });
  await knex('number_sequences').where({ module: 'Ticket' }).update({ last_number: 2 });
  await knex('number_sequences').where({ module: 'Assignment' }).update({ last_number: 3 });
  await knex('number_sequences').where({ module: 'Repair' }).update({ last_number: 1 });

  if (isSqlite) {
    await knex.raw('PRAGMA foreign_keys = ON;');
  } else {
    await knex.raw('SET FOREIGN_KEY_CHECKS = 1;');
  }
};
