require('dotenv').config({ path: __dirname + '/.env' });
const path = require('path');

// Official Hostinger Database Configuration
const mysqlConnection = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'u335953510_itms',
  password: process.env.DB_PASSWORD || 'NkbManufacturing2026',
  database: process.env.DB_DATABASE || 'u335953510_itms_db'
};

module.exports = {
  development: {
    client: 'mysql2',
    connection: mysqlConnection,
    pool: { min: 2, max: 10 },
    migrations: {
      directory: path.join(__dirname, 'migrations')
    },
    seeds: {
      directory: path.join(__dirname, 'seeds')
    }
  },

  test: {
    client: 'sqlite3',
    connection: {
      filename: ':memory:'
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, 'migrations')
    },
    seeds: {
      directory: path.join(__dirname, 'seeds')
    },
    pool: {
      afterCreate: (conn, cb) => {
        conn.run('PRAGMA foreign_keys = ON', cb);
      }
    }
  },

  production: {
    client: 'mysql2',
    connection: mysqlConnection,
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: path.join(__dirname, 'migrations')
    },
    seeds: {
      directory: path.join(__dirname, 'seeds')
    }
  }
};
