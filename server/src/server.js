const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');
const socketUtil = require('./utils/socket');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = express();
const server = http.createServer(app);

// 1. Initialize Socket.IO
socketUtil.init(server);
const { initBackupSocket } = require('./modules/enterprise-backup/socket/backupAgentSocket');
initBackupSocket(socketUtil.getIO());

// 2. Global Security Middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"], // Socket.IO support
      imgSrc: ["'self'", "data:", "blob:", "/uploads/"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"]
    }
  }
}));

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || origin.includes('nkbmanufacturing.com') || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168.')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Agent-UUID', 'X-Agent-Key'],
  credentials: true
};
app.use(cors(corsOptions));

// 3. Rate Limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 4. Request Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log HTTP requests in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    logger.http(`${req.method} ${req.url}`);
    next();
  });
}

// 5. Static folders serving
// Handle favicon requests gracefully to serve favicon.ico file or 204
app.get(['/favicon.ico', '/api/favicon.ico'], (req, res) => {
  const icoPath = path.join(__dirname, '../../client/dist/favicon.ico');
  if (fs.existsSync(icoPath)) {
    return res.sendFile(icoPath);
  }
  const publicIcoPath = path.join(__dirname, '../../client/public/favicon.ico');
  if (fs.existsSync(publicIcoPath)) {
    return res.sendFile(publicIcoPath);
  }
  const logoPath = path.join(__dirname, '../../client/dist/nkb-logo.png');
  if (fs.existsSync(logoPath)) {
    return res.sendFile(logoPath);
  }
  return res.status(204).end();
});

// Serve uploads folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')));

// Explicit 404 for missing upload files to prevent SPA fallback 422 errors
app.use(['/uploads/*', '/api/uploads/*'], (req, res) => {
  res.status(404).json({ success: false, message: 'Requested upload file not found' });
});

// 6. API Route Handlers
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/departments', require('./routes/employees'));
app.use('/api/assets', require('./routes/assets'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/repairs', require('./routes/repairs'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/licenses', require('./routes/licenses'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/audit-logs', require('./routes/auditLogs'));
app.use('/api/reports/itops', require('./routes/reports-itops'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/backups', require('./routes/backups'));
app.use('/api/v1/backups', require('./modules/enterprise-backup/routes/enterpriseBackupRoutes'));
app.use('/api/endpoints', require('./routes/endpoints'));
app.use('/api/network', require('./routes/network'));
app.use('/api/printers', require('./routes/printers'));
app.use('/api/file-shares', require('./routes/fileShares'));
app.use('/api/guest-wifi', require('./routes/guestWifi'));
app.use('/api/websites', require('./routes/websites'));
app.use('/api/secrets', require('./routes/secrets'));
app.use('/api/remote', require('./routes/remoteManagement'));
app.use('/api/v1/agent', require('./routes/agentApi'));

// 7. Serve Static Frontend files
const distPath = path.join(__dirname, '../../client/dist');
app.use(express.static(distPath));

// Wildcard fallback for React Router SPA (Single Page Application)
app.get('*', (req, res, next) => {
  if (req.url.startsWith('/api') || req.url.startsWith('/uploads')) {
    return next();
  }
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  return res.status(404).send('SPA index.html not found. Please run client build.');
});

// 8. Centralized Global Error Handler
app.use((err, req, res, next) => {
  logger.error(`Unhandle Exception: ${err.stack || err.message}`);
  
  const statusCode = err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  
  return res.status(statusCode).json({
    success: false,
    message: err.message || 'An unexpected error occurred on the server.',
    error: err.stack
  });
});

// 9. Startup Server
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test') {
  const db = require('./config/db');
  
  db.migrate.latest()
    .then(async () => {
      logger.info('Database migrated successfully');
      
      // Only run the seeder if the database is completely empty (no roles)
      const rolesCount = await db('roles').count('id as count').first();
      if (rolesCount.count === 0 || rolesCount.count === '0') {
        logger.info('Database is completely empty. Running initial system seeds...');
        await db.seed.run();
        logger.info('Database seeded successfully');
      } else {
        logger.info('Database already contains data. Skipping seeds to protect data.');
      }
      
      // Clean up legacy non-existent file paths to prevent broken <img> rendering
      try {
        const assets = await db('assets').select('id', 'name', 'image_path');
        for (const asset of assets) {
          if (asset.image_path && !asset.image_path.startsWith('data:') && !asset.image_path.startsWith('http') && !fs.existsSync(path.join(__dirname, '..', asset.image_path))) {
            await db('assets').where('id', asset.id).update({ image_path: null });
          }
        }
      } catch (e) {
        logger.error(`Image path cleanup error: ${e.message}`);
      }
      
      server.listen(PORT, () => {
        logger.info(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      });
    })
    .catch((err) => {
      logger.error(`Database startup sequence failed: ${err.message}`);
      // Fallback to start server anyway so frontend remains accessible
      server.listen(PORT, () => {
        logger.info(`Server started in recovery mode on port ${PORT}`);
      });
    });
}

module.exports = { app, server };
