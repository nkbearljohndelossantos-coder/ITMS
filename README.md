# NKB Manufacturing Centralized API Platform

A standalone, production-grade, enterprise-wide API Gateway & Service Platform designed to safely serve internal NKB applications (`NKB-DCC`, `NKB-PPE`, `NKB-FORMULATION`, `NKB-ITMS`) and authorized third-party external applications.

---

## 🌟 Key Architecture & Features

```
External Apps / Frontends
           ↓
        HTTPS
           ↓
    Nginx Reverse Proxy (api.nkbmanufacturing.com)
           ↓
   Request ID Correlation (X-Request-Id UUID)
           ↓
 Bearer API Key Authentication (nkb_live_...) + SHA-256 Hashing
           ↓
 Sliding-Window Rate Limiting (100 req/min, HTTP 429 JSON)
           ↓
 Granular RBAC Scope Validation (documents:read, assets:create, etc.)
           ↓
 Zod Schema Validation (HTTP 422 JSON)
           ↓
 Idempotency Key Processing (Idempotency-Key header caching)
           ↓
      Business Logic
           ↓
  Database (PostgreSQL / SQLite)
           ↓
 Permanent Async Audit Logs & Security Event Tracking
```

### Core Specifications
1. **Standalone API Gateway Architecture**: Completely decoupled from individual web application frontends. Serves endpoints cleanly under versioned `/api/v1/` routes.
2. **Cryptographically Hashed API Keys**:
   - Raw keys (`nkb_live_xxxxxxxxxxxxxxxxxxxxxxxxx`) displayed **ONLY ONCE** upon generation.
   - Database stores peppered SHA-256 hashes (`hashApiKey(rawKey)`).
   - Admin UI displays non-sensitive masked format (`nkb_live_**************7X92`).
3. **Granular RBAC Scopes**:
   - Scope authorization middleware (`requireScope('documents:read')`).
   - Least-privilege access enforcement.
4. **Per-Client Rate Limiting**:
   - Custom rate limits per application.
   - Standard headers returned: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`.
   - Returns HTTP 429 JSON response on breach without leaking server details.
5. **Request Correlation Tracking**:
   - Every request is tagged with a unique `X-Request-Id` UUID, propagated to logs and client responses.
6. **Standardized Response Envelopes**:
   - Success: `{ "success": true, "data": {...}, "meta": { "requestId": "..." } }`
   - Error: `{ "success": false, "error": { "code": "...", "message": "..." }, "meta": { "requestId": "..." } }`
7. **Idempotency Key Support**:
   - Pass `Idempotency-Key: <UUID>` header for state-mutating requests (POST, PUT, PATCH).
   - Duplicate requests return identical cached responses without re-executing logic.
8. **Interactive OpenAPI 3.0 Documentation**:
   - Available live at `https://api.nkbmanufacturing.com/docs`.
   - Raw JSON spec at `/docs/openapi.json`.
9. **React Admin Management Console**:
   - Located at `/api-platform` in the ITMS Navigation Sidebar under **Administration > API Gateway Platform**.
   - Live system health metrics, API client app registration, raw key generation, key rotation/revocation, live audit log viewer, and scope dictionary.

---

## 🚀 Quick Start Guide

### 1. Environment Setup
Copy the template configuration:
```bash
cp server/.env.example server/.env
```

Set secret pepper and JWT keys:
```env
NODE_ENV=production
PORT=5000
API_KEY_PEPPER=your_secret_pepper_string_here
JWT_SECRET=your_jwt_secret_here
DATABASE_URL=postgresql://nkb_user:password@localhost:5432/nkb_api_platform
```

### 2. Database Migration & Seeding
```bash
cd server
npm run migrate
node scripts/run_api_platform_migration.js
```

### 3. Start Development Server
```bash
npm run dev --prefix server
```

### 4. Build Production Client
```bash
npm run build --prefix client
```

---

## 🧪 Testing Integration & Running Verification

Run automated integration tests:
```bash
npm test -- --testPathPattern=apiPlatform.test.js
```

Run sample external client integration script:
```bash
node server/sample_api_client.js
```

---

## 📖 API Documentation & Swagger UI

Access the interactive OpenAPI 3.0 documentation page in your browser:
```
http://localhost:5000/docs
```
or in production:
```
https://api.nkbmanufacturing.com/docs
```

---

## 🐳 Production Deployment (Docker & PM2)

### Docker & Docker Compose
```bash
docker-compose up -d --build
```

### PM2 Process Manager
```bash
pm2 start ecosystem.config.js --env production
```

### Nginx Reverse Proxy
Copy `nginx.conf` to `/etc/nginx/sites-available/api.nkbmanufacturing.com` and reload:
```bash
sudo nginx -t && sudo systemctl reload nginx
```
