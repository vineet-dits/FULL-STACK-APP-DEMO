const { createDbClient } = require('../../shared/db');

async function initTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

const db = createDbClient({
  init: async (pool) => {
    try {
      await initTables(pool);
      console.log('✅ Users table ready');
    } catch (err) {
      console.error('⚠️  Error creating tables:', err.message);
    }
  },
});

module.exports = db;
