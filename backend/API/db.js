const { Pool } = require('pg');

const pool = new Pool({
  user: 'erazmus_admin',
  host: 'erazmus-server.postgres.database.azure.com',  // or the host where your database is
  database: 'erazmus',
  password: 'Password1234',
  port: 5432,  // Default PostgreSQL port
  ssl: {rejectUnauthorized: false},
  connectionTimeoutMillis: 20000, // 20 seconds timeout
  idleTimeoutMillis: 30000, // 30 seconds idle timeout
});

module.exports = pool;