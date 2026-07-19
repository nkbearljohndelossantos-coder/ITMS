# NKB IT Management System (ITMS)

The **NKB IT Management System** is a complete, functional, production-ready corporate IT asset and help desk ticketing web application. It handles asset registries, custody assignments, service desk tickets, preventative maintenance cycles, spare parts warehouses, software licenses compliance, and audit logs.

---

## 1. Project Architecture

The repository is organized as a workspace:
*   `/server`: Node.js, Express, Socket.IO backend. Uses Knex query builder with migrations and seeds supporting SQLite3 (default for local dev) and MySQL (production target).
*   `/client`: React.js web application built with Vite, React Router, Tailwind CSS, Axios, and Recharts.

---

## 2. Prerequisites

Ensure you have the following installed in your host environment:
*   **Node.js** version `v18.0.0` or higher (verified on `v26.3.1`)
*   **npm** version `9.0.0` or higher
*   **SQLite3** (compiled on-the-fly, no global installation needed)
*   **MySQL Server** (optional, recommended for production staging)

---

## 3. Installation & Local Development Setup

Follow these steps to configure the system locally:

### Step 1: Install Dependencies
From the root workspace directory, install the required packages:
```bash
# Install root, client, and server dependencies
npm install
npm run install-all
```

### Step 2: Configure Environment Variables
Create a `.env` file in the `/server` directory. You can duplicate the provided `.env.example`:
```ini
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database (SQLite default for development)
DB_CLIENT=sqlite3
DB_FILE=./data/nkb_itms.sqlite

# JWT Cryptography secrets
JWT_SECRET=super_secret_jwt_key_123456_nkb_itms
JWT_REFRESH_SECRET=super_secret_refresh_jwt_key_123456_nkb_itms
JWT_ACCESS_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d

# Initial Super Admin (Seeded on first migration)
INITIAL_SUPER_ADMIN_USERNAME=admin
INITIAL_SUPER_ADMIN_PASSWORD=AdminPassword123!
INITIAL_SUPER_ADMIN_EMAIL=admin@nkb-itms.com
```

### Step 3: Run Database Migrations & Seeds
Execute the Knex migrations to build the tables and run the seed script to populate default categories, permission matrix blocks, and admin users:
```bash
cd server
# Run tables schema migration
npm run migrate

# Run initial seed data
npm run seed
```

### Step 4: Run the Application
Start the development servers for both backend and frontend:
```bash
# In the root directory, run both servers concurrently:
npm run dev
```
*   **Backend Server**: runs on [http://localhost:5000](http://localhost:5000)
*   **Vite Frontend Client**: runs on [http://localhost:5173](http://localhost:5173) (auto-proxies `/api` and `/socket.io` calls to port 5000)

---

## 4. Running Automated Tests

A Jest + Supertest integration suite is available to verify core endpoint mechanics. It sets up an isolated SQLite database (`/server/data/nkb_itms_test.sqlite`), performs migrations, and seeds testing records automatically.

To execute the test suite:
```bash
cd server
npm run test
```
The test verifies:
1.  **Authentication**: Correct and incorrect password checks.
2.  **Asset CRUD**: Registering new assets and listing inventory details.
3.  **Custody Release/Return**: Checking out assets, updating conditions, and return processes.
4.  **Support Help Desk**: Creating tickets, assigning staff technicians, and resolution actions.
5.  **Inventory Stock Card Deduction**: Registering parts, stocking-in supplies, and deducting them on hardware repairs.
6.  **Software Seats Threshold**: Enforcing seat capacity limits on concurrent assignments.

---

## 5. Production Deployment Guide

For deploying to VPS host environments:

### Database (MySQL Setup)
1.  Create a MySQL database schema e.g. `nkb_itms`.
2.  Configure `/server/.env` parameters:
    ```ini
    NODE_ENV=production
    DB_CLIENT=mysql2
    DB_HOST=127.0.0.1
    DB_USER=your_db_user
    DB_PASSWORD=your_secure_password
    DB_DATABASE=nkb_itms
    ```
3.  Run migrations and seeds to construct the schema on MySQL:
    ```bash
    cd server
    npm run migrate
    npm run seed
    ```

### Process Management (PM2)
Use PM2 to run the Express backend as a persistent background daemon:
1.  Install PM2 globally:
    ```bash
    npm install -g pm2
    ```
2.  Start the server entry point:
    ```bash
    cd server
    pm2 start src/server.js --name "nkb-itms-backend"
    pm2 save
    pm2 startup
    ```

### Client Production Compilation
Compile the React Vite frontend into static bundles:
```bash
cd client
npm run build
```
This outputs the compiled files in `/client/dist`. The backend Express server will automatically serve these static files when `NODE_ENV=production` is set in the environment.

### Nginx Reverse Proxy & SSL Configuration
Configure Nginx as a reverse proxy to handle incoming requests on port 80/443, manage SSL certificates, and fallback to `/index.html` for single page application (SPA) routing.

Add this server block configuration:
```nginx
server {
    listen 80;
    server_name itms.yourcompany.com;
    
    # Redirect HTTP to HTTPS (uncomment when SSL is ready)
    # return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name itms.yourcompany.com;

    ssl_certificate /etc/letsencrypt/live/itms.yourcompany.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/itms.yourcompany.com/privkey.pem;

    # Static client files root
    root /var/www/nkb-itms/client/dist;
    index index.html;

    # Frontend route fallback for React Router
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Proxy calls to Express server
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Socket.IO WebSocket Proxy Support
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## 6. Seeded Default Accounts
Use these accounts to sign in immediately after executing migrations:

| Username | Password | Role | Access Level |
| :--- | :--- | :--- | :--- |
| **admin** | `AdminPassword123!` | Super Admin | Unrestricted root control & settings |
| **itmanager** | `Employee123!` | IT Manager | Full IT operations access |
| **itstaff** | `Employee123!` | IT Staff | Helpdesk, assets, and repairs operations |
| **technician** | `Employee123!` | Technician | Diagnostics, checklists, and repair logging |
| **depthead** | `Employee123!` | Department Head | Staff asset list views & filing tickets |
| **employee** | `Employee123!` | Employee | Standard issue ticketing only |
| **auditor** | `Employee123!` | Auditor | Read-only access to logs, reports, and assets |
