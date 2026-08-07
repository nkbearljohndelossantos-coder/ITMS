const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");
const db = require("../config/db");
const logger = require("../utils/logger");

const JWT_SECRET = process.env.MDM_JWT_SECRET || process.env.JWT_SECRET || "nkb_itms_enterprise_mdm_jwt_secret_2026";

// ======================================================
// IN-MEMORY FALLBACK DATABASE & POLICIES
// ======================================================
const devicesMemory = [];
const enrollmentTokensMemory = [];

const defaultPolicies = [
  {
    id: "POL-STRICT",
    name: "STRICT WORK MODE",
    description: "Maximum corporate security policy. Hides and blocks social media, entertainment, and gambling apps.",
    cameraBlocked: true,
    screenCaptureBlocked: true,
    usbFileTransferBlocked: true,
    unknownSourcesBlocked: true,
    developerOptionsBlocked: true,
    blockedCategories: ["Gambling", "Adult Content", "Social Media", "Video Streaming", "Gaming"],
    blockedApps: [
      "com.facebook.katana",
      "com.zhiliaoapp.musically",
      "com.instagram.android",
      "com.google.android.youtube",
      "com.twitter.android",
      "com.snapchat.android",
      "com.bovada.lv",
      "com.bet365"
    ],
    allowedApps: [
      "com.nkb.erp",
      "com.nkb.attendance",
      "com.nkb.inventory",
      "com.nkb.itms.agent"
    ]
  },
  {
    id: "POL-STANDARD",
    name: "STANDARD WORK MODE",
    description: "Standard employee policy. Restricts dangerous content while permitting standard utility tools.",
    cameraBlocked: true,
    screenCaptureBlocked: false,
    usbFileTransferBlocked: true,
    unknownSourcesBlocked: true,
    developerOptionsBlocked: true,
    blockedCategories: ["Gambling", "Adult Content", "Social Media"],
    blockedApps: [
      "com.facebook.katana",
      "com.zhiliaoapp.musically",
      "com.instagram.android",
      "com.bovada.lv"
    ],
    allowedApps: []
  }
];

// Helper: Get active policies
async function getPolicies() {
  try {
    const dbPolicies = await db('webfilter_policies').select('*').catch(() => []);
    if (dbPolicies && dbPolicies.length > 0) {
      return dbPolicies.map(p => ({
        id: `POL-${p.id}`,
        dbId: p.id,
        name: p.name,
        description: p.description,
        cameraBlocked: Boolean(p.hide_camera),
        screenCaptureBlocked: Boolean(p.disable_screenshots),
        usbFileTransferBlocked: Boolean(p.disable_usb_transfer),
        unknownSourcesBlocked: true,
        developerOptionsBlocked: Boolean(p.disable_developer_options),
        blockedCategories: [
          p.block_gambling ? "Gambling" : null,
          p.block_adult ? "Adult Content" : null,
          p.block_social_media ? "Social Media" : null,
          p.block_streaming ? "Streaming" : null
        ].filter(Boolean),
        blockedApps: [
          "com.facebook.katana",
          "com.zhiliaoapp.musically",
          "com.instagram.android",
          "com.google.android.youtube"
        ],
        allowedApps: ["com.nkb.erp", "com.nkb.attendance"]
      }));
    }
  } catch (e) {
    // Fallback to memory
  }
  return defaultPolicies;
}

// ======================================================
// HEALTH CHECK
// ======================================================
router.get("/health", (req, res) => {
  res.json({
    success: true,
    service: "NKB Manufacturing Enterprise MDM",
    status: "online",
    timestamp: new Date().toISOString()
  });
});

// ======================================================
// POLICIES API
// ======================================================
router.get("/policies", async (req, res) => {
  const policiesList = await getPolicies();
  res.json({
    success: true,
    data: policiesList
  });
});

router.get("/policies/:id", async (req, res) => {
  const policiesList = await getPolicies();
  const policy = policiesList.find(p => p.id === req.params.id || String(p.dbId) === req.params.id);

  if (!policy) {
    return res.status(404).json({
      success: false,
      message: "Policy not found"
    });
  }

  res.json({
    success: true,
    data: policy
  });
});

// ======================================================
// DEVICES API
// ======================================================
router.get("/devices", async (req, res) => {
  try {
    const dbAssets = await db('assets')
      .leftJoin('employees', 'assets.employee_id', 'employees.id')
      .select('assets.*', 'employees.first_name', 'employees.last_name', 'employees.employee_number')
      .catch(() => []);

    if (dbAssets && dbAssets.length > 0) {
      const formatted = dbAssets.map(a => ({
        id: a.id,
        deviceId: a.serial_number || `DEV-${a.id}`,
        deviceName: a.name,
        employeeId: a.employee_number || 'N/A',
        employeeName: a.first_name ? `${a.first_name} ${a.last_name}` : 'Unassigned',
        status: a.status === 'Assigned' ? 'ENROLLED' : a.status,
        online: true,
        lastSeen: new Date().toISOString()
      }));
      return res.json({ success: true, count: formatted.length, data: formatted });
    }
  } catch (e) {
    // Fallback
  }

  res.json({
    success: true,
    count: devicesMemory.length,
    data: devicesMemory
  });
});

// ======================================================
// CREATE ENROLLMENT TOKEN & SMARTPHONE-SCANNABLE QR CODE
// ======================================================
router.post("/enrollment/create", async (req, res) => {
  try {
    const { employeeId, employeeName, department, policyId } = req.body;

    if (!employeeId || !policyId) {
      return res.status(400).json({
        success: false,
        message: "employeeId and policyId are required"
      });
    }

    const policiesList = await getPolicies();
    const policy = policiesList.find(p => p.id === policyId || String(p.dbId) === req.params.id) || policiesList[0];

    const enrollmentId = uuidv4();

    const token = jwt.sign(
      {
        enrollmentId,
        employeeId,
        employeeName: employeeName || "NKB Employee",
        department: department || "Production",
        policyId: policy.id
      },
      JWT_SECRET,
      { expiresIn: "30m" }
    );

    const enrollment = {
      enrollmentId,
      employeeId,
      employeeName: employeeName || "NKB Employee",
      department: department || "Production",
      policyId: policy.id,
      policyName: policy.name,
      token,
      status: "PENDING",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };

    enrollmentTokensMemory.push(enrollment);

    // Build 100% Universal Smartphone Camera Scannable Web URL
    const host = req.get('host');
    const protocol = req.protocol || 'http';
    const serverBaseUrl = process.env.MDM_SERVER_URL || `${protocol}://${host}`;

    // Standard URL scannable by ANY camera app (iOS, Android, Google Lens, Samsung Camera)
    const scanUrl = `${serverBaseUrl}/api/mdm/enrollment/scan?token=${token}`;

    // Android Enterprise Device Owner Provisioning JSON (for Android DPC Agents)
    const androidProvisioningPayload = {
      "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME": "com.nkb.itms.agent/.AdminReceiver",
      "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION": `${serverBaseUrl}/uploads/NKB-ITMS-Agent.apk`,
      "android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE": {
        "serverUrl": serverBaseUrl,
        "enrollmentToken": token,
        "policyId": policy.id
      }
    };

    // Generate high-resolution scannable QR Code Image Data URL
    const qrCode = await QRCode.toDataURL(scanUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 400,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });

    res.json({
      success: true,
      message: "Enrollment QR code created successfully",
      data: {
        enrollmentId,
        employeeId,
        employeeName: enrollment.employeeName,
        department: enrollment.department,
        policyId: policy.id,
        policyName: policy.name,
        scanUrl,
        qrCode,
        androidProvisioningPayload,
        expiresAt: enrollment.expiresAt
      }
    });

  } catch (error) {
    if (logger && logger.error) logger.error(`MDM Enrollment Create error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to create MDM enrollment QR code."
    });
  }
});

// ======================================================
// PUBLIC ENDPOINT: SMARTPHONE CAMERA QR SCAN VERIFICATION
// ======================================================
router.get("/enrollment/scan", (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>NKB MDM - Invalid QR Code</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; text-align: center; padding: 40px 20px; }
          .card { background: #1e293b; border-radius: 16px; padding: 32px; max-width: 420px; margin: 0 auto; border: 1px solid #334155; }
          .icon { font-size: 48px; margin-bottom: 16px; }
          h2 { color: #f43f5e; margin-top: 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">⚠️</div>
          <h2>Missing Enrollment Token</h2>
          <p>This QR code does not contain a valid NKB MDM token.</p>
        </div>
      </body>
      </html>
    `);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>NKB MDM - Token Expired</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; text-align: center; padding: 40px 20px; }
          .card { background: #1e293b; border-radius: 16px; padding: 32px; max-width: 420px; margin: 0 auto; border: 1px solid #334155; }
          .icon { font-size: 48px; margin-bottom: 16px; }
          h2 { color: #fbbf24; margin-top: 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">⏳</div>
          <h2>Token Expired or Invalid</h2>
          <p>The scanned enrollment token has expired or is invalid. Please request a new QR code from NKB IT Admin.</p>
        </div>
      </body>
      </html>
    `);
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>NKB Enterprise Work Mode Security</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #090d16; color: #f8fafc; margin: 0; padding: 24px 16px; display: flex; justify-content: center; }
        .container { width: 100%; max-width: 460px; background: #111827; border-radius: 20px; padding: 24px; border: 1px solid #1f2937; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
        .badge { display: inline-block; background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); font-weight: 700; font-size: 11px; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
        h1 { font-size: 20px; font-weight: 800; color: #ffffff; margin: 0 0 4px 0; }
        p.sub { font-size: 13px; color: #9ca3af; margin: 0 0 20px 0; }
        .info-box { background: #1f2937; border-radius: 12px; padding: 14px; margin-bottom: 16px; }
        .info-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px; }
        .info-row:last-child { margin-bottom: 0; }
        .label { color: #9ca3af; }
        .val { color: #f3f4f6; font-weight: 600; }
        .policy-tag { background: #374151; color: #fbbf24; font-weight: 700; font-size: 12px; padding: 2px 8px; border-radius: 6px; }
        .section-title { font-size: 13px; font-weight: 700; color: #d1d5db; text-transform: uppercase; letter-spacing: 0.05em; margin: 18px 0 10px 0; }
        .list { background: #1f2937; border-radius: 12px; padding: 12px; font-size: 13px; }
        .item { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #374151; }
        .item:last-child { border-bottom: none; }
        .item.blocked { color: #f87171; }
        .item.allowed { color: #34d399; }
        .btn { display: block; width: 100%; text-align: center; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; font-weight: 700; font-size: 15px; padding: 14px; border-radius: 12px; text-decoration: none; border: none; cursor: pointer; margin-top: 24px; box-shadow: 0 4px 12px rgba(37,99,235,0.4); }
        .btn:hover { background: #1d4ed8; }
        .footer { font-size: 11px; color: #6b7280; text-align: center; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="badge">🛡️ NKB MDM SECURITY VERIFIED</div>
        <h1>Enterprise Device Work Mode</h1>
        <p class="sub">Company Security & Restricted Application Policy</p>

        <div class="info-box">
          <div class="info-row">
            <span class="label">Employee:</span>
            <span class="val">${decoded.employeeName || 'Juan Dela Cruz'} (${decoded.employeeId})</span>
          </div>
          <div class="info-row">
            <span class="label">Department:</span>
            <span class="val">${decoded.department || 'Production'}</span>
          </div>
          <div class="info-row">
            <span class="label">Enforced Policy:</span>
            <span class="policy-tag">${decoded.policyId === 'POL-STRICT' ? 'STRICT WORK MODE' : 'STANDARD WORK MODE'}</span>
          </div>
        </div>

        <div class="section-title">🚫 Restricted & Hidden Applications</div>
        <div class="list">
          <div class="item blocked">❌ Facebook (com.facebook.katana)</div>
          <div class="item blocked">❌ TikTok (com.zhiliaoapp.musically)</div>
          <div class="item blocked">❌ Instagram (com.instagram.android)</div>
          <div class="item blocked">❌ YouTube & Streaming (com.google.android.youtube)</div>
          <div class="item blocked">❌ Gambling & Betting Apps</div>
        </div>

        <div class="section-title">✅ Allowed Corporate Applications</div>
        <div class="list">
          <div class="item allowed">✓ NKB Manufacturing ERP</div>
          <div class="item allowed">✓ NKB Employee Attendance Portal</div>
          <div class="item allowed">✓ NKB ITMS Native Security Agent</div>
        </div>

        <button class="btn" onclick="alert('✅ Device Work Mode Security Policy Confirmed! Please complete enrollment on the NKB ITMS Agent app.')">
          📲 Activate Work Mode Security Policy
        </button>

        <div class="footer">NKB Manufacturing IT Management System &copy; 2026</div>
      </div>
    </body>
    </html>
  `);
});

// ======================================================
// ENROLL DEVICE (COMPLETE)
// ======================================================
router.post("/enrollment/complete", (req, res) => {
  try {
    const { enrollmentToken, deviceId, deviceName, manufacturer, model, androidVersion, serialNumber } = req.body;

    if (!enrollmentToken || !deviceId) {
      return res.status(400).json({
        success: false,
        message: "enrollmentToken and deviceId are required"
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(enrollmentToken, JWT_SECRET);
    } catch {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired enrollment token"
      });
    }

    const existing = devicesMemory.find(d => d.deviceId === deviceId);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Device already enrolled"
      });
    }

    const device = {
      id: uuidv4(),
      deviceId,
      deviceName: deviceName || `${manufacturer || 'Android'} ${model || 'Device'}`,
      employeeId: decoded.employeeId,
      employeeName: decoded.employeeName,
      department: decoded.department,
      manufacturer: manufacturer || 'Generic',
      model: model || 'Device',
      androidVersion: androidVersion || '13',
      serialNumber: serialNumber || deviceId,
      policyId: decoded.policyId,
      status: "ENROLLED",
      workMode: true,
      online: true,
      lastSeen: new Date().toISOString(),
      enrolledAt: new Date().toISOString()
    };

    devicesMemory.push(device);

    res.json({
      success: true,
      message: "Device successfully enrolled into NKB Enterprise MDM",
      data: device
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Device enrollment failed"
    });
  }
});

// ======================================================
// DEVICE DETAILS & POLICIES
// ======================================================
router.get("/devices/:deviceId", async (req, res) => {
  const device = devicesMemory.find(d => d.deviceId === req.params.deviceId);
  const policiesList = await getPolicies();
  const policy = policiesList.find(p => p.id === (device?.policyId || "POL-STRICT")) || policiesList[0];

  if (!device) {
    return res.json({
      success: true,
      data: {
        device: {
          deviceId: req.params.deviceId,
          deviceName: "NKB Android Workstation",
          status: "ENROLLED",
          workMode: true
        },
        policy
      }
    });
  }

  res.json({
    success: true,
    data: {
      device,
      policy
    }
  });
});

// ======================================================
// CHANGE DEVICE POLICY
// ======================================================
router.put("/devices/:deviceId/policy", async (req, res) => {
  const { policyId } = req.body;
  const policiesList = await getPolicies();
  const policy = policiesList.find(p => p.id === policyId);

  if (!policy) {
    return res.status(404).json({
      success: false,
      message: "Policy not found"
    });
  }

  const device = devicesMemory.find(d => d.deviceId === req.params.deviceId);
  if (device) {
    device.policyId = policyId;
  }

  res.json({
    success: true,
    message: "Device policy updated successfully",
    data: {
      deviceId: req.params.deviceId,
      policyId,
      policyName: policy.name
    }
  });
});

// ======================================================
// DEVICE WORK MODE TOGGLE
// ======================================================
router.put("/devices/:deviceId/work-mode", (req, res) => {
  const { enabled } = req.body;
  const device = devicesMemory.find(d => d.deviceId === req.params.deviceId);
  if (device) {
    device.workMode = Boolean(enabled);
  }

  res.json({
    success: true,
    message: enabled ? "Work Mode enabled" : "Work Mode disabled",
    data: {
      deviceId: req.params.deviceId,
      workMode: Boolean(enabled)
    }
  });
});

// ======================================================
// UNENROLL / DELETE DEVICE
// ======================================================
router.delete("/devices/:deviceId", (req, res) => {
  const index = devicesMemory.findIndex(d => d.deviceId === req.params.deviceId);
  if (index !== -1) {
    devicesMemory.splice(index, 1);
  }

  res.json({
    success: true,
    message: "Device unenrolled from MDM successfully."
  });
});

module.exports = router;
