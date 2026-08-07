const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config({ path: "./server/.env" });

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.MDM_PORT || process.env.PORT || 3000;
const JWT_SECRET =
  process.env.MDM_JWT_SECRET || "CHANGE_THIS_TO_A_LONG_RANDOM_SECRET";

// ======================================================
// TEMPORARY DATABASE
// Replace these with MySQL tables in production.
// ======================================================

const devices = [];
const policies = [
  {
    id: "POL-STRICT",
    name: "STRICT WORK MODE",

    cameraBlocked: true,
    screenCaptureBlocked: true,
    usbFileTransferBlocked: true,
    unknownSourcesBlocked: true,

    blockedApps: [
      "com.facebook.katana",
      "com.zhiliaoapp.musically",
      "com.instagram.android",
      "com.google.android.youtube"
    ],

    allowedApps: [
      "com.nkb.erp",
      "com.nkb.attendance",
      "com.nkb.inventory"
    ]
  },

  {
    id: "POL-STANDARD",
    name: "STANDARD WORK MODE",

    cameraBlocked: true,
    screenCaptureBlocked: false,
    usbFileTransferBlocked: true,
    unknownSourcesBlocked: true,

    blockedApps: [
      "com.facebook.katana",
      "com.zhiliaoapp.musically",
      "com.instagram.android"
    ],

    allowedApps: []
  }
];

const enrollmentTokens = [];

// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/api/mdm/health", (req, res) => {
  res.json({
    success: true,
    service: "NKB Manufacturing MDM",
    status: "online",
    timestamp: new Date().toISOString()
  });
});

// ======================================================
// POLICIES
// ======================================================

app.get("/api/mdm/policies", (req, res) => {
  res.json({
    success: true,
    data: policies
  });
});

app.get("/api/mdm/policies/:id", (req, res) => {
  const policy = policies.find(p => p.id === req.params.id);

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
// DEVICES
// ======================================================

app.get("/api/mdm/devices", (req, res) => {
  res.json({
    success: true,
    count: devices.length,
    data: devices
  });
});

// ======================================================
// CREATE ENROLLMENT TOKEN
// ======================================================

app.post("/api/mdm/enrollment/create", async (req, res) => {
  try {
    const {
      employeeId,
      employeeName,
      department,
      policyId
    } = req.body;

    if (!employeeId || !policyId) {
      return res.status(400).json({
        success: false,
        message: "employeeId and policyId are required"
      });
    }

    const policy = policies.find(p => p.id === policyId);

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: "Policy not found"
      });
    }

    const enrollmentId = uuidv4();

    const token = jwt.sign(
      {
        enrollmentId,
        employeeId,
        employeeName,
        department,
        policyId
      },
      JWT_SECRET,
      {
        expiresIn: "30m"
      }
    );

    const enrollment = {
      enrollmentId,
      employeeId,
      employeeName,
      department,
      policyId,
      token,
      status: "PENDING",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };

    enrollmentTokens.push(enrollment);

    // QR payload
    const qrPayload = JSON.stringify({
      type: "NKB_MDM_ENROLLMENT",
      server: process.env.MDM_SERVER_URL || "https://your-domain.com",
      enrollmentToken: token
    });

    const qrCode = await QRCode.toDataURL(qrPayload);

    res.json({
      success: true,
      message: "Enrollment QR created",
      data: {
        enrollmentId,
        employeeId,
        employeeName,
        department,
        policyId,
        policyName: policy.name,
        qrCode,
        expiresAt: enrollment.expiresAt
      }
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to create enrollment"
    });
  }
});

// ======================================================
// ENROLL DEVICE
// ======================================================

app.post("/api/mdm/enrollment/complete", (req, res) => {
  try {
    const {
      enrollmentToken,
      deviceId,
      deviceName,
      manufacturer,
      model,
      androidVersion,
      serialNumber
    } = req.body;

    if (!enrollmentToken || !deviceId) {
      return res.status(400).json({
        success: false,
        message: "enrollmentToken and deviceId are required"
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(
        enrollmentToken,
        JWT_SECRET
      );
    } catch {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired enrollment token"
      });
    }

    const enrollment = enrollmentTokens.find(
      e => e.enrollmentId === decoded.enrollmentId
    );

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found"
      });
    }

    const existing = devices.find(
      d => d.deviceId === deviceId
    );

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Device already enrolled"
      });
    }

    const device = {
      id: uuidv4(),

      deviceId,
      deviceName,

      employeeId: decoded.employeeId,
      employeeName: decoded.employeeName,
      department: decoded.department,

      manufacturer,
      model,
      androidVersion,
      serialNumber,

      policyId: decoded.policyId,

      status: "ENROLLED",
      online: true,

      lastSeen: new Date().toISOString(),
      enrolledAt: new Date().toISOString()
    };

    devices.push(device);

    enrollment.status = "COMPLETED";

    res.json({
      success: true,
      message: "Device successfully enrolled",
      data: device
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Device enrollment failed"
    });
  }
});

// ======================================================
// DEVICE DETAILS
// ======================================================

app.get("/api/mdm/devices/:deviceId", (req, res) => {
  const device = devices.find(
    d => d.deviceId === req.params.deviceId
  );

  if (!device) {
    return res.status(404).json({
      success: false,
      message: "Device not found"
    });
  }

  const policy = policies.find(
    p => p.id === device.policyId
  );

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

app.put("/api/mdm/devices/:deviceId/policy", (req, res) => {
  const { policyId } = req.body;

  const device = devices.find(
    d => d.deviceId === req.params.deviceId
  );

  if (!device) {
    return res.status(404).json({
      success: false,
      message: "Device not found"
    });
  }

  const policy = policies.find(
    p => p.id === policyId
  );

  if (!policy) {
    return res.status(404).json({
      success: false,
      message: "Policy not found"
    });
  }

  device.policyId = policyId;

  res.json({
    success: true,
    message: "Device policy updated",
    data: {
      deviceId: device.deviceId,
      policyId,
      policyName: policy.name
    }
  });
});

// ======================================================
// DEVICE WORK MODE
// ======================================================

app.put("/api/mdm/devices/:deviceId/work-mode", (req, res) => {
  const { enabled } = req.body;

  const device = devices.find(
    d => d.deviceId === req.params.deviceId
  );

  if (!device) {
    return res.status(404).json({
      success: false,
      message: "Device not found"
    });
  }

  device.workMode = Boolean(enabled);

  res.json({
    success: true,
    message: enabled
      ? "Work Mode enabled"
      : "Work Mode disabled",
    data: {
      deviceId: device.deviceId,
      workMode: device.workMode
    }
  });
});

// ======================================================
// DELETE / UNENROLL DEVICE
// ======================================================

app.delete("/api/mdm/devices/:deviceId", (req, res) => {
  const index = devices.findIndex(
    d => d.deviceId === req.params.deviceId
  );

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: "Device not found"
    });
  }

  const removed = devices.splice(index, 1);

  res.json({
    success: true,
    message: "Device removed from MDM",
    data: removed[0]
  });
});

// ======================================================
// START SERVER
// ======================================================

app.listen(PORT, () => {
  console.log(`
========================================
 NKB MANUFACTURING MDM
========================================

Server : http://localhost:${PORT}
Status : ONLINE

MDM API:
GET    /api/mdm/health
GET    /api/mdm/devices
GET    /api/mdm/policies

POST   /api/mdm/enrollment/create
POST   /api/mdm/enrollment/complete

PUT    /api/mdm/devices/:deviceId/policy
PUT    /api/mdm/devices/:deviceId/work-mode

DELETE /api/mdm/devices/:deviceId
========================================
`);
});
