const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../../shared/config');
const { connectWithRetry, startConnectionMonitor, getPool, getConnectionStatus } = require('./db');

const app = express();
const PORT = process.env.PORT || 3002;
const JWT_SECRET = getJwtSecret();

app.use(cors());
app.use(express.json());

// Root welcome
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Dashboard Service API',
    service: 'dashboard-service',
    status: 'running',
    dbConnected: getConnectionStatus(),
    health: '/health',
  });
});

// JWT auth middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'dashboard-service',
    status: 'running',
    dbConnected: getConnectionStatus(),
    timestamp: new Date().toISOString(),
  });
});

// Get total user count (requires auth)
app.get('/api/dashboard/user-count', authMiddleware, async (req, res) => {
  if (!getConnectionStatus()) {
    return res.status(503).json({
      error: 'Database is not available. Please try again later.',
      count: 0,
      dbConnected: false,
    });
  }

  try {
    const pool = getPool();
    const result = await pool.query('SELECT COUNT(*) as count FROM users');
    res.json({
      count: parseInt(result.rows[0].count),
      dbConnected: true,
    });
  } catch (err) {
    console.error('Dashboard count error:', err.message);
    res.status(500).json({ error: 'Internal server error', count: 0 });
  }
});

async function start() {
  await connectWithRetry();
  startConnectionMonitor();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Dashboard Service running on port ${PORT}`);
  });
}

start();
