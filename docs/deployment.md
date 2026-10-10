# Production Deployment Guide

This guide describes how to configure, containerize, and deploy the **Healthcare Access Guidance & Operations Platform** in staging and production environments.

---

## 1. Architecture Overview

The production architecture consists of three containerized tiers:

1. **Web Tier (`apps/web`)**: Static single-page application built with React and Vite, served via Nginx Alpine. Nginx handles client-side SPA routing and reverse-proxies `/api/` requests to the API container.
2. **API Tier (`apps/api`)**: Node.js/Express REST API service running under Node 20 LTS Alpine. Enforces strict Zod schema validation, Helmet security headers, in-memory rate limiting, and role-based bearer token authorization.
3. **Database Tier (`PostgreSQL 14+`)**: Relational database with exactly 17 tables, foreign key hierarchies, append-only triggers, and connection pooling.

```
 Internet / Clients
         │
         ▼
 [ Nginx Reverse Proxy (apps/web :80) ]
    ├── Static SPA Assets (HTML, CSS, JS)
    └── /api/* Proxy Pass
              │
              ▼
 [ Node.js Express API (apps/api :5000) ]
    ├── Helmet Security Headers
    ├── In-Memory Rate Limiter (X-RateLimit-*)
    ├── Role Authorization Middleware (Staff / Admin)
    └── pg Connection Pool (Max: 25)
              │
              ▼
 [ PostgreSQL 15 Database (:5432) ]
    └── 17 Normalized Tables & Append-Only Triggers
```

---

## 2. Production Security Hardening

In production (`NODE_ENV=production`), the system enforces the following security invariants:

1. **Demo Bypasses Strictly Disabled**:
   - `ALLOW_UNAUTHENTICATED_ADMIN_DEMO` is strictly rejected by `requireAdmin` middleware.
   - `ALLOW_UNAUTHENTICATED_STAFF_DEMO` is strictly rejected by `requireStaff` middleware.
   - Missing or invalid `Authorization: Bearer <token>` headers return HTTP 401 UNAUTHORIZED or HTTP 403 FORBIDDEN.
2. **Payload Size Restrictions**:
   - `express.json({ limit: '10kb' })` prevents unbounded payload exhaustion attacks.
3. **Rate Limiting**:
   - Rate limiting per IP is enforced on session initiation (`POST /api/guidance/sessions`) and public routes.
   - Excess requests receive HTTP 429 Too Many Requests with `Retry-After` headers.
4. **Zero-PII Storage**:
   - Guidance sessions and operational tokens store zero patient names, Aadhaar numbers, ABHA IDs, or phone numbers.
   - Logs output HTTP method, path, response code, and latency; request bodies are never logged.

---

## 3. Docker Compose Deployment

### Prerequisites
- Docker Engine 24.0+
- Docker Compose v2.20+

### Quick Start
```bash
# 1. Clone repository
git clone https://github.com/example/healthcare-access-guidance-capstone.git
cd healthcare-access-guidance-capstone

# 2. Configure production environment
cp .env.production.example .env.production

# 3. Build and launch containers
docker compose up -d --build

# 4. Verify running services
docker compose ps
```

### Service Health Checks
- **Web**: `http://localhost/` (HTTP 200)
- **API Health**: `http://localhost/api/health`
  ```json
  {
    "status": "HEALTHY",
    "timestamp": "2026-10-10T10:00:00.000Z",
    "service": "healthcare-guidance-api",
    "environment": "production"
  }
  ```
- **Database**: `docker exec healthcare-guidance-db pg_isready -U postgres -d healthcare_guidance_db`

---

## 4. Manual / Bare-Metal Production Deployment

### 1. Database Setup
```bash
# Install and initialize PostgreSQL 15
createdb -U postgres healthcare_guidance_db

# Apply migrations sequentially
for f in database/migrations/*.sql; do
    psql -U postgres -d healthcare_guidance_db -f "$f"
done

# Seed initial synthetic demo data (optional for staging)
./scripts/seed_demo_data.sh
```

### 2. Backend API Setup
```bash
cd apps/api
npm ci --only=production
export NODE_ENV=production
export PORT=5000
export DATABASE_URL="postgresql://user:pass@localhost:5432/healthcare_guidance_db"
export ALLOW_UNAUTHENTICATED_ADMIN_DEMO=false
export ALLOW_UNAUTHENTICATED_STAFF_DEMO=false

# Start process under PM2 or systemd
pm2 start src/server.js --name "healthcare-api" -i max
```

### 3. Frontend Web Setup
```bash
cd apps/web
npm ci
npm run build

# Copy dist/ to web server root (/var/www/html)
sudo cp -r dist/* /var/www/html/
```

---

## 5. Graceful Shutdown & Operational Maintenance

The backend API handles `SIGTERM` and `SIGINT` signals:
1. Stops accepting new inbound HTTP requests.
2. Waits for active in-flight requests to complete.
3. Drains and closes the PostgreSQL connection pool (`pool.end()`).
4. Exits with code 0.

If connections do not close within 10 seconds, a safety timeout forces termination.
