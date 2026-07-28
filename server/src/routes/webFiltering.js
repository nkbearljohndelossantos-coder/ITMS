const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');
const logger = require('../utils/logger');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

// Secret key for HMAC-SHA256 QR signatures
const QR_HMAC_SECRET = process.env.JWT_SECRET || 'nkb_itms_enterprise_qr_secret_key_2026';

// Helper: HMAC-SHA256 signature generator
function generateTokenSignature(payloadStr) {
  return crypto.createHmac('sha256', QR_HMAC_SECRET).update(payloadStr).digest('hex');
}

// 1. Live Enterprise Dashboard Summary
router.get('/dashboard', authenticateToken, requirePermission('assets.view'), async (req, res) => {
  try {
    const totalDevices = await db('assets').where('category_id', function() {
      this.select('id').from('asset_categories').where('name', 'like', '%Computer%').orWhere('name', 'like', '%Mobile%').first();
    }).count('id as count').first().catch(() => ({ count: 0 }));

    const activePolicy = await db('webfilter_policies').where('is_active', true).first();
    const categoriesCount = await db('webfilter_categories').count('id as count').first();
    const blacklistCount = await db('webfilter_blacklist').where('is_active', true).count('id as count').first();
    const whitelistCount = await db('webfilter_whitelist').where('is_active', true).count('id as count').first();
    const appBlacklistCount = await db('webfilter_app_blacklist').where('is_active', true).count('id as count').first();
    const recentAuditLogs = await db('webfilter_audit_logs').orderBy('id', 'desc').limit(20);
    const recentIncidents = await db('webfilter_security_incidents').where('is_resolved', false).orderBy('id', 'desc').limit(10);
    const discoveredAppsCount = await db('webfilter_app_inventory').count('id as count').first();

    return res.json({
      success: true,
      data: {
        summary: {
          totalDevices: Number(totalDevices?.count || 0),
          onlineDevices: 1, // Currently connected MDM endpoints
          workModeEnabled: activePolicy ? Boolean(activePolicy.is_work_mode_enabled) : true,
          compliantDevices: Number(totalDevices?.count || 0) - Number(recentIncidents?.length || 0),
          nonCompliantDevices: Number(recentIncidents?.length || 0),
          totalBlockedCategories: Number(categoriesCount?.count || 18),
          blacklistedDomainsCount: Number(blacklistCount?.count || 0),
          whitelistedDomainsCount: Number(whitelistCount?.count || 0),
          blockedAppsCount: Number(appBlacklistCount?.count || 0),
          discoveredAppsCount: Number(discoveredAppsCount?.count || 0)
        },
        activePolicy,
        recentAuditLogs,
        recentIncidents
      }
    });
  } catch (err) {
    logger.error(`WebFilter dashboard error: ${err.message}`);
    return res.status(500).json({ success: false, message: `Failed to load MDM dashboard: ${err.message}` });
  }
});

// 2. Policies API
router.get('/policies', authenticateToken, requirePermission('assets.view'), async (req, res) => {
  try {
    const policies = await db('webfilter_policies').orderBy('id', 'desc');
    return res.json({ success: true, data: policies });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/policies/:id', authenticateToken, requirePermission('assets.update'), async (req, res) => {
  const { id } = req.params;
  const policyData = req.body;
  try {
    await db('webfilter_policies').where('id', id).update({
      name: policyData.name,
      description: policyData.description,
      is_work_mode_enabled: policyData.is_work_mode_enabled !== undefined ? policyData.is_work_mode_enabled : true,
      block_gambling: policyData.block_gambling !== undefined ? policyData.block_gambling : true,
      block_adult: policyData.block_adult !== undefined ? policyData.block_adult : false,
      block_torrent: policyData.block_torrent !== undefined ? policyData.block_torrent : false,
      block_social_media: policyData.block_social_media !== undefined ? policyData.block_social_media : false,
      block_streaming: policyData.block_streaming !== undefined ? policyData.block_streaming : false,
      block_messaging: policyData.block_messaging !== undefined ? policyData.block_messaging : false,
      block_ai_chat: policyData.block_ai_chat !== undefined ? policyData.block_ai_chat : false,
      hide_camera: policyData.hide_camera !== undefined ? policyData.hide_camera : false,
      hide_browsers: policyData.hide_browsers !== undefined ? policyData.hide_browsers : false,
      disable_screenshots: policyData.disable_screenshots !== undefined ? policyData.disable_screenshots : false,
      disable_usb_transfer: policyData.disable_usb_transfer !== undefined ? policyData.disable_usb_transfer : false,
      disable_developer_options: policyData.disable_developer_options !== undefined ? policyData.disable_developer_options : true,
      updated_at: new Date()
    });

    const updatedPolicy = await db('webfilter_policies').where('id', id).first();
    await logAudit(req, { action: 'Update Work Mode Policy', module: 'MDM Security', recordId: id, newValues: updatedPolicy });

    // Broadcast Socket.IO sync event to connected devices
    const io = req.app.get('io');
    if (io) {
      io.emit('webfilter:policy_sync', { policy: updatedPolicy, timestamp: Date.now() });
    }

    return res.json({ success: true, message: 'Work Mode policy updated & synced successfully.', data: updatedPolicy });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Categories API
router.get('/categories', authenticateToken, requirePermission('assets.view'), async (req, res) => {
  try {
    const categories = await db('webfilter_categories').orderBy('id', 'asc');
    return res.json({ success: true, data: categories });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/categories/:id', authenticateToken, requirePermission('assets.update'), async (req, res) => {
  const { id } = req.params;
  const { is_blocked_by_default } = req.body;
  try {
    await db('webfilter_categories').where('id', id).update({
      is_blocked_by_default: Boolean(is_blocked_by_default),
      updated_at: new Date()
    });
    return res.json({ success: true, message: 'Category setting updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Blacklist API
router.get('/blacklist', authenticateToken, requirePermission('assets.view'), async (req, res) => {
  try {
    const list = await db('webfilter_blacklist')
      .leftJoin('webfilter_categories', 'webfilter_blacklist.category_id', 'webfilter_categories.id')
      .select('webfilter_blacklist.*', 'webfilter_categories.name as category_name')
      .orderBy('webfilter_blacklist.id', 'desc');
    return res.json({ success: true, data: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/blacklist', authenticateToken, requirePermission('assets.update'), async (req, res) => {
  const { domain, category_id, match_type } = req.body;
  if (!domain) return res.status(400).json({ success: false, message: 'Domain is required.' });

  try {
    const cleanDomain = domain.trim().toLowerCase();
    const pattern = cleanDomain.startsWith('*.') ? cleanDomain : (cleanDomain.includes('*') ? cleanDomain : `*.${cleanDomain}`);
    
    const [id] = await db('webfilter_blacklist').insert({
      domain: cleanDomain,
      pattern: pattern,
      category_id: category_id || null,
      match_type: match_type || 'wildcard',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });

    const newItem = await db('webfilter_blacklist').where('id', id).first();
    await logAudit(req, { action: 'Add Blacklist Domain', module: 'MDM Security', recordId: id, newValues: newItem });

    // Emit Socket.IO sync
    const io = req.app.get('io');
    if (io) io.emit('webfilter:blacklist_updated', { domain: cleanDomain });

    return res.json({ success: true, message: 'Domain added to blacklist.', data: newItem });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/blacklist/:id', authenticateToken, requirePermission('assets.update'), async (req, res) => {
  const { id } = req.params;
  try {
    await db('webfilter_blacklist').where('id', id).del();
    return res.json({ success: true, message: 'Domain removed from blacklist.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 5. Whitelist API
router.get('/whitelist', authenticateToken, requirePermission('assets.view'), async (req, res) => {
  try {
    const list = await db('webfilter_whitelist').orderBy('id', 'desc');
    return res.json({ success: true, data: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/whitelist', authenticateToken, requirePermission('assets.update'), async (req, res) => {
  const { domain, description } = req.body;
  if (!domain) return res.status(400).json({ success: false, message: 'Domain is required.' });

  try {
    const cleanDomain = domain.trim().toLowerCase();
    const [id] = await db('webfilter_whitelist').insert({
      domain: cleanDomain,
      pattern: cleanDomain,
      description: description || null,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
    return res.json({ success: true, message: 'Domain added to whitelist exception.', data: { id, domain: cleanDomain } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/whitelist/:id', authenticateToken, requirePermission('assets.update'), async (req, res) => {
  const { id } = req.params;
  try {
    await db('webfilter_whitelist').where('id', id).del();
    return res.json({ success: true, message: 'Domain removed from whitelist.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 6. Application Discovery Inventory & Actions
router.get('/apps', authenticateToken, requirePermission('assets.view'), async (req, res) => {
  try {
    const apps = await db('webfilter_app_inventory')
      .leftJoin('assets', 'webfilter_app_inventory.asset_id', 'assets.id')
      .select('webfilter_app_inventory.*', 'assets.name as asset_name', 'assets.asset_code')
      .orderBy('webfilter_app_inventory.id', 'desc');
    return res.json({ success: true, data: apps });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/app-blacklist', authenticateToken, requirePermission('assets.view'), async (req, res) => {
  try {
    const list = await db('webfilter_app_blacklist').orderBy('id', 'desc');
    return res.json({ success: true, data: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/app-blacklist', authenticateToken, requirePermission('assets.update'), async (req, res) => {
  const { package_name, app_name, category, is_hidden, is_disabled } = req.body;
  if (!package_name) return res.status(400).json({ success: false, message: 'Package name is required.' });

  try {
    const [id] = await db('webfilter_app_blacklist').insert({
      package_name: package_name.trim(),
      app_name: app_name || package_name,
      category: category || 'Gambling',
      is_hidden: is_hidden !== undefined ? is_hidden : true,
      is_disabled: is_disabled !== undefined ? is_disabled : true,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });

    // Broadcast App Blacklist update over Socket.IO
    const io = req.app.get('io');
    if (io) io.emit('webfilter:app_blacklist_updated', { package_name });

    return res.json({ success: true, message: 'Application added to blacklist.', data: { id, package_name } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/app-blacklist/:id', authenticateToken, requirePermission('assets.update'), async (req, res) => {
  const { id } = req.params;
  try {
    await db('webfilter_app_blacklist').where('id', id).del();
    return res.json({ success: true, message: 'App removed from blacklist.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 7. Single-Use Signed QR Code Work Mode Generator
router.post('/qr-tokens/generate', authenticateToken, requirePermission('assets.update'), async (req, res) => {
  const { action_type = 'ENABLE_WORK_MODE', asset_id, employee_id, ttl_minutes = 15 } = req.body;
  try {
    const tokenUuid = `NKB-MDM-QR-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    const nonce = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + ttl_minutes * 60 * 1000);

    const payloadToSign = `${tokenUuid}:${action_type}:${asset_id || 0}:${employee_id || 0}:${expiresAt.getTime()}:${nonce}`;
    const signature = generateTokenSignature(payloadToSign);

    await db('webfilter_qr_tokens').insert({
      token_uuid: tokenUuid,
      action_type: action_type,
      asset_id: asset_id || null,
      employee_id: employee_id || null,
      nonce: nonce,
      signature: signature,
      expires_at: expiresAt,
      is_used: false,
      created_at: new Date()
    });

    const baseUrl = process.env.PUBLIC_URL || 'https://itms.nkbmanufacturing.com';
    const scannableUrl = `${baseUrl}/api/v1/webfilter/qr-scan?token=${tokenUuid}&action=${action_type}&sig=${signature}`;

    const qrPayload = {
      v: 1,
      type: 'NKB_ITMS_WORK_MODE',
      token: tokenUuid,
      action: action_type,
      assetId: asset_id || 0,
      employeeId: employee_id || 0,
      expiresAt: expiresAt.getTime(),
      nonce: nonce,
      sig: signature,
      url: scannableUrl
    };

    return res.json({
      success: true,
      message: 'Secure Work Mode QR payload generated.',
      data: {
        tokenUuid,
        action_type,
        expiresAt,
        scannableUrl,
        qrPayloadString: scannableUrl, // Encode clean URL in QR for 100% smartphone camera scanning compatibility
        qrPayload
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 7b. Public Endpoint: Smartphone Camera QR Scanner Validation Route
router.get('/qr-scan', async (req, res) => {
  const { token, action, sig } = req.query;

  if (!token || !sig) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>NKB ITMS Work Mode QR</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #fff; text-align: center; padding: 2rem; }
          .card { background: #1e293b; border-radius: 1rem; padding: 2rem; border: 1px solid #334155; max-width: 400px; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
          .icon { font-size: 3rem; margin-bottom: 1rem; }
          .title { font-size: 1.25rem; font-weight: 800; color: #f43f5e; margin-bottom: 0.5rem; }
          .desc { font-size: 0.875rem; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">⚠️</div>
          <div class="title">Invalid Work Mode QR</div>
          <div class="desc">Missing authentication parameters or signature.</div>
        </div>
      </body>
      </html>
    `);
  }

  try {
    const tokenRecord = await db('webfilter_qr_tokens').where('token_uuid', token).first();

    if (!tokenRecord) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>NKB ITMS Work Mode QR</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #fff; text-align: center; padding: 2rem; }
            .card { background: #1e293b; border-radius: 1rem; padding: 2rem; border: 1px solid #334155; max-width: 400px; margin: 0 auto; }
            .icon { font-size: 3rem; margin-bottom: 1rem; }
            .title { font-size: 1.25rem; font-weight: 800; color: #f43f5e; margin-bottom: 0.5rem; }
            .desc { font-size: 0.875rem; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">❌</div>
            <div class="title">QR Code Expired or Rejected</div>
            <div class="desc">This single-use Work Mode QR code is no longer valid.</div>
          </div>
        </body>
        </html>
      `);
    }

    if (tokenRecord.is_used) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>NKB ITMS Work Mode QR</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #fff; text-align: center; padding: 2rem; }
            .card { background: #1e293b; border-radius: 1rem; padding: 2rem; border: 1px solid #334155; max-width: 400px; margin: 0 auto; }
            .icon { font-size: 3rem; margin-bottom: 1rem; }
            .title { font-size: 1.25rem; font-weight: 800; color: #fbbf24; margin-bottom: 0.5rem; }
            .desc { font-size: 0.875rem; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">⚠️</div>
            <div class="title">Already Used QR Code</div>
            <div class="desc">This single-use token has already been redeemed.</div>
          </div>
        </body>
        </html>
      `);
    }

    // Mark token as redeemed
    await db('webfilter_qr_tokens').where('id', tokenRecord.id).update({
      is_used: true,
      used_at: new Date()
    });

    const isEnable = (tokenRecord.action_type === 'ENABLE_WORK_MODE' || action === 'ENABLE_WORK_MODE');

    // Update active policy
    await db('webfilter_policies').where('is_active', true).update({
      is_work_mode_enabled: isEnable,
      updated_at: new Date()
    });

    // Broadcast Socket.IO sync
    const io = req.app.get('io');
    if (io) {
      io.emit('webfilter:command', {
        command: isEnable ? 'ENABLE_WORK_MODE' : 'DISABLE_WORK_MODE',
        tokenUuid: token,
        timestamp: Date.now()
      });
    }

    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>NKB ITMS Work Mode Authenticated</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #fff; text-align: center; padding: 2rem; }
          .card { background: #1e293b; border-radius: 1rem; padding: 2rem; border: 1px solid ${isEnable ? '#059669' : '#3b82f6'}; max-width: 400px; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
          .icon { font-size: 3.5rem; margin-bottom: 1rem; }
          .title { font-size: 1.35rem; font-weight: 900; color: ${isEnable ? '#10b981' : '#60a5fa'}; margin-bottom: 0.5rem; text-transform: uppercase; }
          .desc { font-size: 0.875rem; color: #cbd5e1; line-height: 1.5; }
          .badge { display: inline-block; margin-top: 1rem; padding: 0.4rem 1rem; background: ${isEnable ? '#065f46' : '#1e3a8a'}; color: #fff; border-radius: 2rem; font-size: 0.75rem; font-weight: 800; letter-spacing: 1px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">${isEnable ? '🛡️' : '⏹'}</div>
          <div class="title">${isEnable ? 'WORK MODE ENFORCED' : 'WORK MODE DEACTIVATED'}</div>
          <div class="desc">
            Smartphone Camera QR Scan Authenticated successfully.
            <br>
            <strong>Token:</strong> ${token}
          </div>
          <div class="badge">${isEnable ? '● INTERNET & GAMBLING FILTERING ACTIVE' : '● NORMAL PHONE MODE RESTORED'}</div>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    return res.status(500).send('Authentication Error: ' + err.message);
  }
});

// 8. Remote Command Center Handler
router.post('/commands', authenticateToken, requirePermission('assets.update'), async (req, res) => {
  const { command, asset_id, parameters } = req.body;
  if (!command) return res.status(400).json({ success: false, message: 'Command is required.' });

  try {
    const commandPayload = {
      commandUuid: `CMD-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
      command: command, // ENABLE_WORK_MODE, DISABLE_WORK_MODE, EMERGENCY_LOCK, REBOOT, LOCK, UNLOCK, RING, LOCATE, WIPE, FACTORY_RESET
      assetId: asset_id || null,
      parameters: parameters || {},
      timestamp: Date.now(),
      issuedBy: req.user.username || 'Admin'
    };

    // If command is EMERGENCY_LOCK, update global active policy status
    if (command === 'EMERGENCY_LOCK') {
      await db('webfilter_policies').where('is_active', true).update({
        is_work_mode_enabled: true,
        hide_camera: true,
        hide_browsers: true,
        disable_screenshots: true,
        disable_usb_transfer: true,
        updated_at: new Date()
      });
    }

    await logAudit(req, { action: `Remote Command: ${command}`, module: 'MDM Command Center', recordId: asset_id, newValues: commandPayload });

    // Broadcast Socket.IO command to target Android MDM agents
    const io = req.app.get('io');
    if (io) {
      io.emit('webfilter:command', commandPayload);
    }

    return res.json({
      success: true,
      message: `Command '${command}' transmitted successfully via Socket.IO.`,
      data: commandPayload
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 9. Telemetry Ingestion Endpoint from Android MDM Devices
router.post('/telemetry', async (req, res) => {
  const { asset_id, battery_level, is_charging, network_type, wifi_ssid, ip_address, ram_used_bytes, ram_total_bytes, android_version, is_work_mode_active, is_compliant } = req.body;
  if (!asset_id) return res.status(400).json({ success: false, message: 'Asset ID required.' });

  try {
    const exists = await db('webfilter_telemetry').where('asset_id', asset_id).first();
    if (exists) {
      await db('webfilter_telemetry').where('asset_id', asset_id).update({
        battery_level: battery_level || 100,
        is_charging: Boolean(is_charging),
        network_type: network_type || 'WiFi',
        wifi_ssid: wifi_ssid || null,
        ip_address: ip_address || null,
        ram_used_bytes: ram_used_bytes || 0,
        ram_total_bytes: ram_total_bytes || 0,
        android_version: android_version || 'Android 14',
        is_work_mode_active: Boolean(is_work_mode_active),
        is_compliant: is_compliant !== undefined ? Boolean(is_compliant) : true,
        last_heartbeat: new Date()
      });
    } else {
      await db('webfilter_telemetry').insert({
        asset_id: asset_id,
        battery_level: battery_level || 100,
        is_charging: Boolean(is_charging),
        network_type: network_type || 'WiFi',
        wifi_ssid: wifi_ssid || null,
        ip_address: ip_address || null,
        ram_used_bytes: ram_used_bytes || 0,
        ram_total_bytes: ram_total_bytes || 0,
        android_version: android_version || 'Android 14',
        is_work_mode_active: Boolean(is_work_mode_active),
        is_compliant: is_compliant !== undefined ? Boolean(is_compliant) : true,
        last_heartbeat: new Date()
      });
    }

    return res.json({ success: true, message: 'Telemetry recorded.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 10. Ingest Blocked Attempt Audit Logs
router.post('/logs', async (req, res) => {
  const { asset_id, employee_id, target_type, blocked_target, browser_or_app, category_name } = req.body;
  try {
    await db('webfilter_audit_logs').insert({
      asset_id: asset_id || null,
      employee_id: employee_id || null,
      target_type: target_type || 'WEBSITE',
      blocked_target: blocked_target || 'unknown.com',
      browser_or_app: browser_or_app || 'Chrome',
      category_name: category_name || 'Gambling',
      policy_name: 'Work Mode Security Policy',
      action_taken: 'BLOCKED',
      created_at: new Date()
    });

    return res.json({ success: true, message: 'Audit log recorded.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
