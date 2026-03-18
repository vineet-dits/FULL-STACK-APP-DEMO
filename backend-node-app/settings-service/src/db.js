const { createDbClient } = require('../../shared/db');

async function initTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_settings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE,
      color VARCHAR(7) NOT NULL DEFAULT '#6366f1',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

const db = createDbClient({
  init: async (pool) => {
    try {
      await initTables(pool);
      console.log('✅ User settings table ready');
    } catch (err) {
      console.error('⚠️  Error creating settings table:', err.message);
    }
  },
});

module.exports = db;
