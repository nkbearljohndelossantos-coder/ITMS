const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required.'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_123456_nkb_itms', (err, user) => {
    if (err) {
      logger.warn(`JWT verification failed: ${err.message}`);
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired access token.'
      });
    }

    req.user = user;
    next();
  });
};

const requirePermission = (permissionCode) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. User authentication required.'
      });
    }

    // Super Admin, IT Manager, and Admin bypass individual permission checks
    const userRoles = Array.isArray(req.user.roles) ? req.user.roles : (req.user.role ? [req.user.role] : []);
    if (userRoles.some(r => ['Super Admin', 'IT Manager', 'Admin'].includes(r))) {
      return next();
    }

    if (req.user.permissions && req.user.permissions.includes(permissionCode)) {
      return next();
    }

    logger.warn(`User ${req.user.username} was denied permission to ${permissionCode}`);
    return res.status(403).json({
      success: false,
      message: `Forbidden. You do not have the required permission (${permissionCode}) to perform this action.`
    });
  };
};

module.exports = {
  authenticateToken,
  requirePermission
};
