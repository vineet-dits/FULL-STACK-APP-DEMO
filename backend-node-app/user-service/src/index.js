const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../../shared/config');
const { connectWithRetry, startConnectionMonitor, getPool, getConnectionStatus } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = getJwtSecret();

app.use(cors());
app.use(express.json());

// Root welcome
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to User Service API',
    service: 'user-service',
    status: 'running',
    dbConnected: getConnectionStatus(),
    health: '/health',
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'user-service',
    status: 'running',
    dbConnected: getConnectionStatus(),
    timestamp: new Date().toISOString(),
  });
});

// Register
app.post('/api/users/register', async (req, res) => {
  if (!getConnectionStatus()) {
    return res.status(503).json({ error: 'Database is not available. Please try again later.' });
  }

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const pool = getPool();

    // Check if user exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password and insert
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email, created_at',
      [email, hashedPassword]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      message: 'User registered successfully',
      user: { id: user.id, email: user.email, created_at: user.created_at },
      token,
    });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
app.post('/api/users/login', async (req, res) => {
  if (!getConnectionStatus()) {
    return res.status(503).json({ error: 'Database is not available. Please try again later.' });
  }

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email },
      token,
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user count (internal API for dashboard service)
app.get('/api/users/count', async (req, res) => {
  if (!getConnectionStatus()) {
    return res.status(503).json({ error: 'Database is not available', count: 0 });
  }

  try {
    const pool = getPool();
    const result = await pool.query('SELECT COUNT(*) as count FROM users');
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error('Count error:', err.message);
    res.status(500).json({ error: 'Internal server error', count: 0 });
  }
});

// Get user by ID (internal API)
app.get('/api/users/:id', async (req, res) => {
  if (!getConnectionStatus()) {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const pool = getPool();
    const result = await pool.query('SELECT id, email, created_at FROM users WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get user error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function start() {
  await connectWithRetry();
  startConnectionMonitor();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 User Service running on port ${PORT}`);
  });
}

start();
