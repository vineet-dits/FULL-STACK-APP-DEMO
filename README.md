# Full Stack Microservices App (Node + Postgres + Docker)

## Services

- `user-service` (port `3001`): register/login + JWT
- `dashboard-service` (port `3002`): returns total user count (JWT required)
- `settings-service` (port `3003`): per-user theme color (JWT required)
- `frontend` (port `8080`): static UI served by nginx
- `postgres` (port `5432`): database

## Run with Docker Compose

From the repo root:

```bash
docker compose up --build
```

Open the UI:

- `http://localhost:8080`

## Configuration (.env)

Docker Compose reads variables from the repo-root `.env`.

- Example template: `.env.example`
- If you prefer a shared backend env file, you can keep values in `backend-node-app/.env` as well (the backend shared config will read it).
- Backend local templates (if running services outside Docker):
  - `backend-node-app/user-service/.env.example`
  - `backend-node-app/dashboard-service/.env.example`
  - `backend-node-app/settings-service/.env.example`
- Frontend template (values baked into `env.js` at image build time):
  - `frontend-react-app/.env.example`

## Full flow documentation

See `docs/FULL-APPLICATION-FLOW.md` for:
- end-to-end request flow (register/login → dashboard count → per-user color)
- API endpoints + env vars
- running + smoke testing + troubleshooting

## What to test

- **Register** with email + password (creates user in Postgres)
- **Login** with same credentials (JWT stored in browser localStorage)
- **Dashboard** shows **Total Users** count
- **Settings** lets you pick a color and saves it per-user

## DB down behavior (degraded mode)

Each backend service attempts DB connection with retries on startup. If Postgres is unavailable:

- services **still start** and `/health` returns `dbConnected: false`
- API routes that require DB return `503`
- frontend shows a warning banner: “Database connection unavailable…”

## Kubernetes / ArgoCD (later)

This repo is structured so you can build and deploy each service separately:

- `backend-node-app/user-service/Dockerfile`
- `backend-node-app/dashboard-service/Dockerfile`
- `backend-node-app/settings-service/Dockerfile`
- `frontend-react-app/Dockerfile`

