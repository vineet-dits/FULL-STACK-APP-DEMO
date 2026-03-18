const { Pool } = require('pg');
const { getDbConfig } = require('./config');

function createDbClient({
  init,
  maxRetries = 10,
  retryDelayMs = 3000,
  monitorIntervalMs = 5000,
} = {}) {
  let pool = null;
  let isConnected = false;
  let monitorStarted = false;

  function ensurePool() {
    if (pool) return pool;
    const cfg = getDbConfig();
    pool = new Pool({
      host: cfg.host,
      port: cfg.port,
      database: cfg.database,
      user: cfg.user,
      password: cfg.password,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.error('⚠️  Database pool error:', err.message);
      isConnected = false;
    });

    return pool;
  }

  async function connectWithRetry() {
    for (let i = 1; i <= maxRetries; i++) {
      try {
        const p = ensurePool();
        const client = await p.connect();
        client.release();
        isConnected = true;
        console.log('✅ Database connected successfully');
        if (typeof init === 'function') await init(p);
        return true;
      } catch (err) {
        console.warn(`⚠️  DB connection attempt ${i}/${maxRetries} failed: ${err.message}`);
        if (i < maxRetries) await new Promise((r) => setTimeout(r, retryDelayMs));
      }
    }
    console.warn('⚠️  Could not connect to database. Running in degraded mode.');
    isConnected = false;
    return false;
  }

  function startConnectionMonitor() {
    if (monitorStarted) return;
    monitorStarted = true;

    setInterval(async () => {
      try {
        const p = ensurePool();
        await p.query('SELECT 1');
        if (!isConnected) {
          isConnected = true;
          console.log('✅ Database reconnected');
          if (typeof init === 'function') await init(p);
        }
      } catch (err) {
        if (isConnected) console.warn(`⚠️  Database connection lost: ${err.message}`);
        isConnected = false;
      }
    }, monitorIntervalMs);
  }

  function getPool() {
    return ensurePool();
  }

  function getConnectionStatus() {
    return isConnected;
  }

  return { connectWithRetry, startConnectionMonitor, getPool, getConnectionStatus };
}

module.exports = { createDbClient };

