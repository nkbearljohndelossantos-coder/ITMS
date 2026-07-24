const MeshCentralProvider = require('./MeshCentralProvider');
const SimulationProvider = require('./SimulationProvider');
const db = require('../../config/db');
const logger = require('../../utils/logger');

/**
 * Factory for Remote Management Providers.
 * Mode is strictly dictated by environment configuration (process.env.REMOTE_MGMT_MODE).
 */
class RemoteProviderFactory {
  static async getProvider() {
    const envMode = (process.env.REMOTE_MGMT_MODE || 'simulation').toLowerCase();

    if (envMode === 'production') {
      // Server-side Production Activation Gate Verification
      const unpassedGates = await db('production_activation_gates').where({ is_passed: false });
      if (unpassedGates.length > 0) {
        logger.warn(`[RemoteProviderFactory] Production mode requested, but ${unpassedGates.length} Production Gate checks remain unpassed! Falling back to SimulationProvider for safety.`);
        return new SimulationProvider();
      }

      logger.info('[RemoteProviderFactory] Production Activation Gate validated! Initializing MeshCentralProductionProvider.');
      return new MeshCentralProvider(
        process.env.MESHCENTRAL_SERVER_URL,
        process.env.MESHCENTRAL_API_USER,
        process.env.MESHCENTRAL_API_TOKEN_HASH
      );
    }

    logger.info('[RemoteProviderFactory] Environment set to SIMULATION. Initializing isolated SimulationProvider.');
    return new SimulationProvider();
  }

  static getEffectiveMode() {
    return (process.env.REMOTE_MGMT_MODE || 'simulation').toLowerCase();
  }
}

module.exports = RemoteProviderFactory;
