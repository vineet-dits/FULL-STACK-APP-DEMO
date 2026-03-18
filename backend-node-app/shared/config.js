const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load env in a way that supports:
// - Each service deployed separately with its own ".env" (default dotenv behavior)
// - A shared monorepo ".env" at "backend-node-app/.env"
//
// Priority: process env > service-local .env > backend-node-app/.env
dotenv.config(); // service-local .env (if present)

const sharedEnvPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(sharedEnvPath)) {
  dotenv.config({ path: sharedEnvPath, override: false });
}

function env(name, fallback) {
  const v = process.env[name];
  if (v !== undefined && v !== '') return v;
  if (fallback !== undefined) return fallback;
  return undefined;
}

function envInt(name, fallback) {
  const raw = env(name);
  if (raw === undefined) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function getDbConfig() {
  return {
    host: env('DB_HOST', 'localhost'),
    port: envInt('DB_PORT', 5432),
    database: env('DB_NAME', 'microservices_db'),
    user: env('DB_USER', 'postgres'),
    password: env('DB_PASSWORD', 'postgres'),
  };
}

function getJwtSecret() {
  return env('JWT_SECRET', 'super-secret-key-change-in-prod');
}

module.exports = { env, envInt, getDbConfig, getJwtSecret };

