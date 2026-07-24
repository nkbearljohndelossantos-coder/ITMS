const express = require('express');
const router = express.Router();
const db = require('../config/db');
const logger = require('../utils/logger');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');
const { getNextNumber } = require('../utils/numberSequence');
const { uploadImage, uploadDocument } = require('../utils/uploader');
const path = require('path');
const fs = require('fs');
const { syncAssetsToManagedDevices } = require('../utils/assetDeviceSync');

// Get all assets (paginated, searched, filtered)
router.get('/', authenticateToken, requirePermission('assets.view'), async (req, res) => {
  const { page = 1, limit = 10, search = '', categoryId = '', status = '', condition = '', warrantyExpiring = 'false' } = req.query;
  const isSqlite = db.client.config.client === 'sqlite3';
  const concatEmpName = isSqlite 
    ? db.raw("(employees.first_name || ' ' || employees.last_name) as employee_name") 
    : db.raw("concat(employees.first_name, ' ', employees.last_name) as employee_name");

  try {
    const query = db('assets')
      .leftJoin('asset_categories', 'assets.category_id', 'asset_categories.id')
      .leftJoin('departments', 'assets.department_id', 'departments.id')
      .leftJoin('employees', 'assets.employee_id', 'employees.id')
      .select(
        'assets.*',
        'asset_categories.name as category_name',
        'departments.name as department_name',
        concatEmpName
      );

    // Filters
    if (search) {
      query.where((builder) => {
        builder.where('assets.asset_code', 'like', `%${search}%`)
          .orWhere('assets.name', 'like', `%${search}%`)
          .orWhere('assets.brand', 'like', `%${search}%`)
          .orWhere('assets.model', 'like', `%${search}%`)
          .orWhere('assets.serial_number', 'like', `%${search}%`)
          .orWhere('assets.current_location', 'like', `%${search}%`);
      });
    }

    if (categoryId) query.where('assets.category_id', categoryId);
    if (status) query.where('assets.status', status);
    if (condition) query.where('assets.condition', condition);

    // Warranty expiring warning (e.g. within 30 days)
    if (warrantyExpiring === 'true') {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const todayStr = new Date().toISOString().split('T')[0];
      const limitStr = thirtyDaysFromNow.toISOString().split('T')[0];
      
      query.where('assets.warranty_end_date', '>=', todayStr)
        .andWhere('assets.warranty_end_date', '<=', limitStr);
    }

    // Total Count
    const countQuery = db.select(db.raw('count(*) as count')).from(query.clone().as('subquery'));
    const [{ count }] = await countQuery;

    // Pagination
    const offset = (page - 1) * limit;
    const data = await query
      .orderBy('assets.asset_code', 'desc')
      .limit(limit)
      .offset(offset);

    return res.json({
      success: true,
      data: {
        assets: data,
        pagination: {
          total: parseInt(count),
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });

  } catch (err) {
    logger.error(`Get assets list error: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to retrieve assets list.' });
  }
});

// Get single asset profile by ID or Asset Code
router.get('/:id', authenticateToken, requirePermission('assets.view'), async (req, res) => {
  const { id } = req.params;
  const isSqlite = db.client.config.client === 'sqlite3';
  const concatEmpName = isSqlite 
    ? db.raw("(employees.first_name || ' ' || employees.last_name) as employee_name") 
    : db.raw("concat(employees.first_name, ' ', employees.last_name) as employee_name");

  try {
    const asset = await db('assets')
      .leftJoin('asset_categories', 'assets.category_id', 'asset_categories.id')
      .leftJoin('departments', 'assets.department_id', 'departments.id')
      .leftJoin('employees', 'assets.employee_id', 'employees.id')
      .select(
        'assets.*',
        'asset_categories.name as category_name',
        'departments.name as department_name',
        concatEmpName
      )
      .where((builder) => {
        builder.where('assets.id', id).orWhere('assets.asset_code', id);
      })
      .first();

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found.' });
    }

    // Retrieve supporting documents
    const documents = await db('asset_documents').where('asset_id', asset.id);

    // Retrieve history log
    const history = await db('asset_history')
      .leftJoin('users', 'asset_history.performed_by', 'users.id')
      .select('asset_history.*', 'users.username as performed_by_username')
      .where('asset_history.asset_id', asset.id)
      .orderBy('asset_history.created_at', 'desc');

    // Retrieve active assignments
    const assignments = await db('asset_assignments')
      .leftJoin('employees', 'asset_assignments.employee_id', 'employees.id')
      .leftJoin('departments', 'asset_assignments.department_id', 'departments.id')
      .select(
        'asset_assignments.*',
        concatEmpName,
        'departments.name as department_name'
      )
      .where('asset_assignments.asset_id', asset.id)
      .orderBy('asset_assignments.created_at', 'desc');

    return res.json({
      success: true,
      data: {
        asset,
        documents,
        history,
        assignments
      }
    });

  } catch (err) {
    logger.error(`Get asset by ID error: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to retrieve asset profile.' });
  }
});

// Create Asset (auto generates asset code, QR code and barcode)
router.post('/', authenticateToken, requirePermission('assets.create'), uploadImage.single('image'), async (req, res) => {
  const assetData = req.body;

  if (!assetData.name || !assetData.category_id || !assetData.brand || !assetData.model || !assetData.serial_number) {
    return res.status(400).json({ success: false, message: 'Name, Category, Brand, Model, and Serial Number are required.' });
  }

  try {
    // Check serial number uniqueness
    const exists = await db('assets').where('serial_number', assetData.serial_number).first();
    if (exists) {
      return res.status(400).json({ success: false, message: `Serial number '${assetData.serial_number}' already exists.` });
    }

    let newAssetId;
    await db.transaction(async (trx) => {
      // 1. Generate unique asset code
      const assetCode = await getNextNumber('Asset', trx);

      // 2. Prepare file upload path
      const imagePath = req.file ? `/uploads/images/${req.file.filename}` : null;

      // 3. QR code text payload
      const qrText = `NKB-ITMS:ASSET:${assetCode}`;
      const barcodeText = assetCode; // Use asset code as barcode

      // 4. Insert Asset
      const [id] = await trx('assets').insert({
        asset_code: assetCode,
        qr_code: qrText,
        barcode: barcodeText,
        name: assetData.name,
        category_id: assetData.category_id,
        brand: assetData.brand,
        model: assetData.model,
        serial_number: assetData.serial_number,
        description: assetData.description || null,
        specs_cpu: assetData.specs_cpu || null,
        specs_ram: assetData.specs_ram || null,
        specs_storage: assetData.specs_storage || null,
        specs_os: assetData.specs_os || null,
        specs_win_edition: assetData.specs_win_edition || null,
        hostname: assetData.hostname || null,
        mac_address: assetData.mac_address || null,
        ip_address: assetData.ip_address || null,
        purchase_date: assetData.purchase_date || null,
        purchase_price: assetData.purchase_price || 0,
        supplier: assetData.supplier || null,
        invoice_number: assetData.invoice_number || null,
        warranty_start_date: assetData.warranty_start_date || null,
        warranty_end_date: assetData.warranty_end_date || null,
        condition: assetData.condition || 'New',
        status: 'Available', // Default starting status
        remarks: assetData.remarks || null,
        image_path: imagePath,
        created_by: req.user.id,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date()
      });
      newAssetId = id;

      // 5. Write to Asset History
      await trx('asset_history').insert({
        asset_id: newAssetId,
        action: 'Create',
        notes: `Asset profile created under code: ${assetCode}`,
        performed_by: req.user.id,
        created_at: new Date()
      });
    });

    const newAsset = await db('assets').where('id', newAssetId).first();
    await logAudit(req, { action: 'Create Asset', module: 'Assets', recordId: newAssetId, newValues: newAsset });

    // Synchronize to Remote Devices
    syncAssetsToManagedDevices().catch(err => logger.error(`Asset sync error: ${err.message}`));

    return res.json({
      success: true,
      message: 'Asset created successfully.',
      data: newAsset
    });

  } catch (err) {
    logger.error(`Create asset error: ${err.message}`);
    // Clean up uploaded image if transaction failed
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    return res.status(500).json({ success: false, message: `Failed to create asset: ${err.message}` });
  }
});

// Add documents to an asset (invoice, warranty, manual)
router.post('/:id/documents', authenticateToken, requirePermission('assets.update'), uploadDocument.array('files'), async (req, res) => {
  const { id } = req.params;

  if (!req.files || !req.files.length) {
    return res.status(400).json({ success: false, message: 'No documents were uploaded.' });
  }

  try {
    const asset = await db('assets').where('id', id).first();
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found.' });

    const insertedDocs = [];
    await db.transaction(async (trx) => {
      for (const file of req.files) {
        const docPath = `/uploads/documents/${file.filename}`;
        
        const [docId] = await trx('asset_documents').insert({
          asset_id: id,
          name: file.originalname,
          file_path: docPath,
          file_size: file.size,
          file_type: path.extname(file.originalname).substring(1),
          created_at: new Date()
        });

        insertedDocs.push({ id: docId, name: file.originalname, file_path: docPath });
      }

      // Add to Asset History
      await trx('asset_history').insert({
        asset_id: id,
        action: 'Update',
        notes: `Uploaded ${req.files.length} supporting document(s).`,
        performed_by: req.user.id,
        created_at: new Date()
      });
    });

    await logAudit(req, { action: 'Upload Asset Documents', module: 'Assets', recordId: id, newValues: insertedDocs });

    return res.json({
      success: true,
      message: 'Supporting documents uploaded successfully.',
      data: insertedDocs
    });

  } catch (err) {
    logger.error(`Upload asset docs error: ${err.message}`);
    // Clean up uploaded files on fail
    if (req.files) {
      req.files.forEach(f => fs.unlink(f.path, () => {}));
    }
    return res.status(500).json({ success: false, message: 'Failed to upload documents.' });
  }
});

// Update Asset
router.put('/:id', authenticateToken, requirePermission('assets.update'), async (req, res) => {
  const { id } = req.params;
  const assetData = req.body;

  try {
    const oldAsset = await db('assets').where('id', id).first();
    if (!oldAsset) return res.status(404).json({ success: false, message: 'Asset not found.' });

    // Validate unique serial number
    if (assetData.serial_number) {
      const serialExists = await db('assets')
        .where('serial_number', assetData.serial_number)
        .whereNot('id', id)
        .first();
      if (serialExists) {
        return res.status(400).json({ success: false, message: `Serial number '${assetData.serial_number}' is already registered to another asset.` });
      }
    }

    await db.transaction(async (trx) => {
      // 1. Update fields
      await trx('assets').where('id', id).update({
        name: assetData.name || oldAsset.name,
        category_id: assetData.category_id || oldAsset.category_id,
        brand: assetData.brand || oldAsset.brand,
        model: assetData.model || oldAsset.model,
        serial_number: assetData.serial_number || oldAsset.serial_number,
        description: assetData.description !== undefined ? assetData.description : oldAsset.description,
        specs_cpu: assetData.specs_cpu !== undefined ? assetData.specs_cpu : oldAsset.specs_cpu,
        specs_ram: assetData.specs_ram !== undefined ? assetData.specs_ram : oldAsset.specs_ram,
        specs_storage: assetData.specs_storage !== undefined ? assetData.specs_storage : oldAsset.specs_storage,
        specs_os: assetData.specs_os !== undefined ? assetData.specs_os : oldAsset.specs_os,
        specs_win_edition: assetData.specs_win_edition !== undefined ? assetData.specs_win_edition : oldAsset.specs_win_edition,
        hostname: assetData.hostname !== undefined ? assetData.hostname : oldAsset.hostname,
        mac_address: assetData.mac_address !== undefined ? assetData.mac_address : oldAsset.mac_address,
        ip_address: assetData.ip_address !== undefined ? assetData.ip_address : oldAsset.ip_address,
        purchase_date: assetData.purchase_date !== undefined ? assetData.purchase_date : oldAsset.purchase_date,
        purchase_price: assetData.purchase_price !== undefined ? assetData.purchase_price : oldAsset.purchase_price,
        supplier: assetData.supplier !== undefined ? assetData.supplier : oldAsset.supplier,
        invoice_number: assetData.invoice_number !== undefined ? assetData.invoice_number : oldAsset.invoice_number,
        warranty_start_date: assetData.warranty_start_date !== undefined ? assetData.warranty_start_date : oldAsset.warranty_start_date,
        warranty_end_date: assetData.warranty_end_date !== undefined ? assetData.warranty_end_date : oldAsset.warranty_end_date,
        condition: assetData.condition || oldAsset.condition,
        status: assetData.status || oldAsset.status,
        remarks: assetData.remarks !== undefined ? assetData.remarks : oldAsset.remarks,
        updated_by: req.user.id,
        updated_at: new Date()
      });

      // 2. Track differences for history logs
      let notes = 'Updated asset details.';
      if (assetData.condition && assetData.condition !== oldAsset.condition) {
        notes += ` Condition changed from '${oldAsset.condition}' to '${assetData.condition}'.`;
      }
      if (assetData.status && assetData.status !== oldAsset.status) {
        notes += ` Status changed from '${oldAsset.status}' to '${assetData.status}'.`;
      }

      await trx('asset_history').insert({
        asset_id: id,
        action: 'Update',
        notes: notes,
        performed_by: req.user.id,
        created_at: new Date()
      });
    });

    const updatedAsset = await db('assets').where('id', id).first();
    await logAudit(req, { action: 'Update Asset', module: 'Assets', recordId: id, oldValues: oldAsset, newValues: updatedAsset });

    return res.json({ success: true, message: 'Asset updated successfully.', data: updatedAsset });

  } catch (err) {
    logger.error(`Update asset error: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to update asset profile.' });
  }
});

// Soft Delete Asset (sets status to 'Retired')
router.delete('/:id', authenticateToken, requirePermission('assets.delete'), async (req, res) => {
  const { id } = req.params;

  try {
    const asset = await db('assets').where('id', id).first();
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found.' });

    // Enforce business logic: if asset has assignment history, it MUST only be soft deleted (Retired)
    const hasAssignments = await db('asset_assignments').where('asset_id', id).first();
    const hasRepairs = await db('repairs').where('asset_id', id).first();
    const hasPM = await db('maintenance_schedules').where('asset_id', id).first();

    if (hasAssignments || hasRepairs || hasPM) {
      await db.transaction(async (trx) => {
        await trx('assets').where('id', id).update({
          status: 'Retired',
          remarks: `${asset.remarks || ''} [Retired via admin delete command on ${new Date().toLocaleDateString()}]`,
          updated_at: new Date()
        });

        await trx('asset_history').insert({
          asset_id: id,
          action: 'Update',
          notes: 'Asset soft deleted by admin. Status set to Retired.',
          performed_by: req.user.id,
          created_at: new Date()
        });
      });

      await logAudit(req, { action: 'Soft Delete Asset (Retire)', module: 'Assets', recordId: id });
      return res.json({
        success: true,
        message: 'Asset has transaction history and cannot be hard deleted. Its status has been updated to Retired.'
      });
    }

    // If no transactions exist, hard delete is permitted
    await db.transaction(async (trx) => {
      // Delete documents first
      await trx('asset_documents').where('asset_id', id).del();
      await trx('asset_history').where('asset_id', id).del();
      await trx('assets').where('id', id).del();
    });

    await logAudit(req, { action: 'Delete Asset (Hard)', module: 'Assets', recordId: id, oldValues: asset });
    return res.json({ success: true, message: 'Asset profile deleted successfully.' });

  } catch (err) {
    logger.error(`Delete asset error: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to delete asset.' });
  }
});

module.exports = router;
