const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../../shared/config');
const { connectWithRetry, startConnectionMonitor, getPool, getConnectionStatus } = require('./db');

const app = express();
const PORT = process.env.PORT || 3003;
const JWT_SECRET = getJwtSecret();

app.use(cors());
app.use(express.json());

// Root welcome
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Settings Service API',
    service: 'settings-service',
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
    service: 'settings-service',
    status: 'running',
    dbConnected: getConnectionStatus(),
    timestamp: new Date().toISOString(),
  });
});

// Get user settings
app.get('/api/settings', authMiddleware, async (req, res) => {
  if (!getConnectionStatus()) {
    return res.status(503).json({
      error: 'Database is not available. Please try again later.',
      settings: { color: '#6366f1' },
      dbConnected: false,
    });
  }

  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM user_settings WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.json({
        settings: { color: '#6366f1' },
        dbConnected: true,
      });
    }

    res.json({
      settings: { color: result.rows[0].color },
      dbConnected: true,
    });
  } catch (err) {
    console.error('Get settings error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user settings (set color)
app.put('/api/settings', authMiddleware, async (req, res) => {
  if (!getConnectionStatus()) {
    return res.status(503).json({
      error: 'Database is not available. Please try again later.',
      dbConnected: false,
    });
  }

  const { color } = req.body;
  if (!color) {
    return res.status(400).json({ error: 'Color is required' });
  }

  // Validate hex color
  const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
  if (!hexColorRegex.test(color)) {
    return res.status(400).json({ error: 'Invalid color format. Use hex color like #ff5733' });
  }

  try {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO user_settings (user_id, color, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id)
       DO UPDATE SET color = $2, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [req.user.id, color]
    );

    res.json({
      message: 'Settings updated successfully',
      settings: { color: result.rows[0].color },
      dbConnected: true,
    });
  } catch (err) {
    console.error('Update settings error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function start() {
  await connectWithRetry();
  startConnectionMonitor();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Settings Service running on port ${PORT}`);
  });
}

start();
