const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('./logger');

let ioInstance = null;

/**
 * Initialize Socket.IO server
 * @param {Object} httpServer - Node HTTP server instance
 */
function init(httpServer) {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authenticate socket connections using JWT
  ioInstance.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers['authorization']?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_123456_nkb_itms', (err, decoded) => {
        if (err) {
          return next(new Error('Invalid token'));
        }
        socket.user = decoded;
        next();
      });
    } catch (err) {
      logger.error(`Socket auth error: ${err.message}`);
      next(new Error('Authentication failed'));
    }
  });

  ioInstance.on('connection', (socket) => {
    const userId = socket.user.id;
    const username = socket.user.username;
    const roles = socket.user.roles || [];

    logger.info(`Socket connected: User ${username} (ID: ${userId})`);

    // 1. Join user-specific room for private notifications
    socket.join(`user_${userId}`);

    // 2. Join role-specific rooms for department/staff alerts
    roles.forEach(role => {
      socket.join(`role_${role}`);
      logger.debug(`User ${username} joined socket room: role_${role}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: User ${username} (ID: ${userId})`);
    });
  });

  return ioInstance;
}

/**
 * Get the initialized io instance
 */
function getIO() {
  if (!ioInstance) {
    throw new Error('Socket.IO is not initialized!');
  }
  return ioInstance;
}

/**
 * Send real-time notification to a specific user
 * @param {number} userId - Target user ID
 * @param {Object} data - Notification object
 */
function notifyUser(userId, data) {
  try {
    const io = getIO();
    io.to(`user_${userId}`).emit('notification', data);
    logger.debug(`Real-time notification emitted to user_${userId}: "${data.title}"`);
  } catch (err) {
    logger.error(`Error sending user notification: ${err.message}`);
  }
}

/**
 * Send real-time notification to a specific role
 * @param {string} roleName - Target role (e.g. 'IT Staff', 'Technician')
 * @param {Object} data - Notification object
 */
function notifyRole(roleName, data) {
  try {
    const io = getIO();
    io.to(`role_${roleName}`).emit('notification', data);
    logger.debug(`Real-time notification emitted to role_${roleName}: "${data.title}"`);
  } catch (err) {
    logger.error(`Error sending role notification: ${err.message}`);
  }
}

/**
 * Broadcast real-time notification to everyone
 * @param {Object} data - Notification object
 */
function broadcast(data) {
  try {
    const io = getIO();
    io.emit('notification', data);
    logger.debug(`Real-time notification broadcasted: "${data.title}"`);
  } catch (err) {
    logger.error(`Error broadcasting notification: ${err.message}`);
  }
}

module.exports = {
  init,
  getIO,
  notifyUser,
  notifyRole,
  broadcast
};
