require('dotenv').config({ path: __dirname + '/.env' });
const path = require('path');
const fs = require('fs');

const dbClient = process.env.DB_CLIENT || 'sqlite3';
const isSqlite = dbClient === 'sqlite3';

let sqliteDbPath = path.resolve(__dirname, process.env.DB_FILE || './data/nkb_itms.sqlite');
if (isSqlite) {
  const dbDir = path.dirname(sqliteDbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}

const sqliteConnection = { filename: sqliteDbPath };
const mysqlConnection = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'u335953510_itms',
  password: process.env.DB_PASSWORD || 'NkbManufacturing2026',
  database: process.env.DB_DATABASE || 'u335953510_itms_db'
};

module.exports = {
  development: {
    client: dbClient,
    connection: isSqlite ? sqliteConnection : mysqlConnection,
    useNullAsDefault: isSqlite,
    pool: isSqlite ? {
      afterCreate: (conn, cb) => {
        conn.run('PRAGMA foreign_keys = ON', cb);
      }
    } : { min: 2, max: 10 },
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
    client: process.env.DB_CLIENT || 'mysql2',
    connection: (process.env.DB_CLIENT === 'sqlite3') ? sqliteConnection : mysqlConnection,
    useNullAsDefault: (process.env.DB_CLIENT === 'sqlite3'),
    pool: (process.env.DB_CLIENT === 'sqlite3') ? {
      afterCreate: (conn, cb) => {
        conn.run('PRAGMA foreign_keys = ON', cb);
      }
    } : { min: 2, max: 10 },
    migrations: {
      directory: path.join(__dirname, 'migrations')
    },
    seeds: {
      directory: path.join(__dirname, 'seeds')
    }
  }
};
