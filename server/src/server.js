const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const logger = require('./utils/logger');
const socketUtil = require('./utils/socket');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = express();
const server = http.createServer(app);

// 1. Initialize Socket.IO
socketUtil.init(server);

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
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
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
// Serve uploads folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 6. API Route Handlers
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/employees', require('./routes/employees'));
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
app.use('/api/endpoints', require('./routes/endpoints'));
app.use('/api/network', require('./routes/network'));
app.use('/api/printers', require('./routes/printers'));
app.use('/api/file-shares', require('./routes/fileShares'));
app.use('/api/guest-wifi', require('./routes/guestWifi'));
app.use('/api/websites', require('./routes/websites'));
app.use('/api/secrets', require('./routes/secrets'));

// 7. Serve Static Frontend files
const distPath = path.join(__dirname, '../../client/dist');
app.use(express.static(distPath));

// Wildcard fallback for React Router SPA (Single Page Application)
app.get('*', (req, res, next) => {
  // Exclude API calls from wildcard fallback
  if (req.url.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
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
  server.listen(PORT, () => {
    logger.info(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}

module.exports = { app, server };
