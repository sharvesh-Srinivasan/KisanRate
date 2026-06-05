<div align="center">

# 🌾 KisanRate

**Hyperlocal crop price discovery, AI predictions & WhatsApp alerts — built for Indian farmers.**

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js)](https://nodejs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python%203.11-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql)](https://mysql.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://docker.com)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?logo=github-actions)](https://github.com/features/actions)

[Live Demo](https://kisanrate.vercel.app) · [Backend API](https://kisanrate-backend.onrender.com) · [ML Service](https://kisanrate-ml.onrender.com)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [API Reference](#-api-reference)
- [WhatsApp Bot](#-whatsapp-bot)
- [ML Prediction Engine](#-ml-prediction-engine)
- [Background Jobs](#-background-jobs)
- [Admin Dashboard](#-admin-dashboard)
- [Environment Variables](#-environment-variables)
- [Local Setup — Docker (Recommended)](#-local-setup--docker-recommended)
- [Local Setup — Manual](#-local-setup--manual)
- [Docker Reference](#-docker-reference)
- [CI/CD Pipeline](#-cicd-pipeline)
- [Deployment](#-deployment)
- [Security](#-security)

---

## 🌱 Overview

KisanRate is a full-stack, real-time mandi price platform that aggregates official crop price data from the **Agmarknet API**, generates **AI-powered next-day price predictions** using Facebook Prophet, and delivers price alerts directly to farmers via **WhatsApp** — without requiring any app download.

The platform has two interfaces:
- **Public web dashboard** — browse, filter, and chart live prices across Tamil Nadu mandis
- **WhatsApp bot** — farmers send a simple message to get instant price quotes and subscribe to daily alerts

---

## ✨ Features

### Public Dashboard
| Feature | Description |
|---|---|
| 📊 **Live prices** | Real-time crop prices across Tamil Nadu mandis, updated daily from Agmarknet |
| 🔍 **Filter & search** | Filter by state, district, and crop name |
| 📈 **30-day price charts** | Click any crop card to see its historical trend (Recharts) |
| 🤖 **AI price prediction** | Next-day price estimate with confidence range (min/max) |
| ⚡ **Real-time updates** | Socket.io pushes live price updates to all connected clients |
| 🔔 **Push notifications** | Web Push API notifies subscribers when prices update |
| 📱 **WhatsApp subscription** | One-form signup to receive daily price alerts on WhatsApp |

### WhatsApp Bot
| Command | Action |
|---|---|
| `HI` | Get menu of available commands |
| `Tomato Chennai` | Get current price for a crop at a mandi |
| `SUBSCRIBE Tomato Chennai` | Subscribe for daily price alerts |
| `STOP` | Unsubscribe from alerts |

### Admin Dashboard
| Tab | Capabilities |
|---|---|
| **Prices** | View all price entries, fetch prices manually, clear stale predictions, refresh AI predictions |
| **Analytics** | Visual charts and market insights |
| **Farmers** | View registered farmers, toggle subscriptions, delete records |
| **WhatsApp Logs** | Paginated view of all WhatsApp conversations |
| **Alerts** | Send test alerts to all subscribers |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Client (React/Vercel)                        │
│  Home page · Price cards · Charts · WhatsApp CTA · Admin dashboard  │
└────────────────────────┬───────────────────────────────────────────┘
                         │ REST + Socket.io
┌────────────────────────▼───────────────────────────────────────────┐
│                     Server (Express/Render)                         │
│                                                                     │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────────────────┐  │
│  │  REST API    │  │  Socket.io  │  │  node-cron jobs           │  │
│  │  /api/prices │  │  real-time  │  │  • fetchPrices (6AM)      │  │
│  │  /api/farmers│  │  updates    │  │  • sendAlerts (7AM)       │  │
│  │  /api/alerts │  │             │  │  • keep-alive (*/10 min)  │  │
│  │  /api/push   │  └─────────────┘  └──────────────────────────┘  │
│  │  /api/whatsapp│                                                  │
│  └──────┬───────┘                                                   │
└─────────┼───────────────────────────────────────────────────────────┘
          │                           │                    │
          ▼                           ▼                    ▼
 ┌─────────────────┐    ┌─────────────────────┐    ┌────────────────┐
 │   MySQL 8.0     │    │  ML Service          │    │ External APIs  │
 │  crops, mandis  │    │  (FastAPI/Render)    │    │  • Agmarknet   │
 │  prices         │    │  Facebook Prophet    │    │  • Twilio WA   │
 │  farmers        │    │  /predict endpoint   │    │  • Web Push    │
 │  whatsapp_logs  │    └─────────────────────┘    └────────────────┘
 │  admins         │
 └─────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend (`client/`)
| Technology | Version | Purpose |
|---|---|---|
| React | 18.3 | UI framework |
| React Router | 6.x | Client-side routing |
| Tailwind CSS | 3.4 | Utility-first styling |
| Recharts | 2.x | Price history charts |
| Socket.io-client | 4.7 | Real-time price updates |
| Axios | 1.7 | HTTP client |
| Lucide React | 0.395 | Icons |
| Web Push API | Browser | Push notification subscription |

### Backend (`server/`)
| Technology | Version | Purpose |
|---|---|---|
| Node.js | 20 | Runtime |
| Express | 4.19 | HTTP framework |
| Socket.io | 4.7 | WebSocket server |
| mysql2 | 3.10 | MySQL client (promise-based) |
| jsonwebtoken | 9.x | JWT auth for admin |
| bcryptjs | 2.x | Password hashing |
| node-cron | 3.x | Scheduled jobs |
| Twilio | 4.x | WhatsApp messaging |
| web-push | 3.6 | Push notifications (VAPID) |
| axios | 1.7 | HTTP client (calls ML service) |
| express-rate-limit | 7.3 | Rate limiting |

### ML Service (`ml/`)
| Technology | Version | Purpose |
|---|---|---|
| Python | 3.11 | Runtime |
| FastAPI | Latest | REST API framework |
| Uvicorn | Latest | ASGI server |
| Facebook Prophet | Latest | Time-series forecasting |
| pandas | Latest | Data manipulation |
| numpy | Latest | Numerical operations |
| mysql-connector-python | Latest | Database connection |
| python-dotenv | Latest | Environment variable loading |

### Infrastructure
| Technology | Purpose |
|---|---|
| Docker + Compose | Containerisation & local dev |
| GitHub Actions | CI/CD pipeline |
| GitHub Container Registry (GHCR) | Docker image storage |
| Render | Backend + ML hosting |
| Vercel | Frontend hosting |
| MySQL 8.0 | Primary database |

---

## 📁 Project Structure

```
kisanrate/
│
├── 📄 docker-compose.yml          # Full local dev stack (MySQL + ML + Server + Client)
├── 📄 docker-compose.prod.yml     # Production overrides (pull images from GHCR)
├── 📄 render.yaml                 # Render deployment config
├── 📄 schema.sql                  # MySQL database schema
├── 📄 tailwind.config.js          # Root Tailwind config
├── 📄 .env.example                # Environment variable template
│
├── 📁 .github/
│   └── workflows/
│       ├── ci.yml                 # CI: lint + docker build on PRs
│       └── deploy.yml             # CD: build → push to GHCR → deploy to Render
│
├── 📁 client/                     # React SPA (Vercel)
│   ├── Dockerfile                 # Multi-stage: Node → Nginx
│   ├── nginx.conf                 # SPA routing + gzip + cache headers
│   ├── .dockerignore
│   ├── public/
│   │   ├── index.html             # HTML shell + Google Fonts preconnect
│   │   ├── manifest.json          # PWA manifest
│   │   └── service-worker.js      # PWA service worker
│   └── src/
│       ├── App.jsx                # Router setup
│       ├── api.js                 # All API calls (axios)
│       ├── index.css              # Global styles + design system
│       ├── socket.js              # Socket.io client instance
│       ├── pwa.js                 # Push notification helpers
│       ├── pages/
│       │   ├── Home.jsx           # Public dashboard
│       │   ├── Admin.jsx          # Admin dashboard
│       │   └── Login.jsx          # Admin login
│       └── components/
│           ├── Navbar.jsx         # Top navigation
│           ├── StatsBanner.jsx    # Crops/mandis count strip
│           ├── FilterBar.jsx      # State/district/crop filters
│           ├── PriceCard.jsx      # Individual crop price card
│           ├── PriceChart.jsx     # 30-day history chart (Recharts)
│           ├── PredictionBadge.jsx # AI prediction display
│           ├── WhatsAppCTA.jsx    # WhatsApp subscription section
│           ├── PushNotificationBanner.jsx # Web push opt-in
│           └── AnalyticsTab.jsx   # Admin analytics charts
│
├── 📁 server/                     # Express API (Render)
│   ├── Dockerfile                 # Node 20 Alpine, prod deps, non-root
│   ├── .dockerignore
│   ├── index.js                   # App entry: routes, middleware, startup
│   ├── seed.js                    # DB seed script
│   ├── config/
│   │   └── db.js                  # MySQL connection pool
│   ├── routes/
│   │   ├── priceRoutes.js         # /api/prices/*
│   │   ├── farmerRoutes.js        # /api/farmers/*
│   │   ├── alertRoutes.js         # /api/alerts/*
│   │   ├── whatsappRoutes.js      # /api/whatsapp/*
│   │   └── pushRoutes.js          # /api/push/*
│   ├── controllers/               # Route handlers
│   ├── middleware/
│   │   └── auth.js                # JWT verification middleware
│   ├── services/
│   │   ├── agmarknetService.js    # Agmarknet API integration
│   │   ├── mlService.js           # ML service client (retry logic)
│   │   └── twilioService.js       # WhatsApp message sending
│   ├── jobs/
│   │   ├── fetchPrices.js         # Cron: fetch Agmarknet prices (6AM daily)
│   │   └── sendAlerts.js          # Cron: send WhatsApp alerts (7AM daily)
│   └── socket/
│       └── socketHandler.js       # Socket.io events
│
└── 📁 ml/                         # FastAPI ML Service (Render)
    ├── Dockerfile                 # Python 3.11 slim, non-root
    ├── .dockerignore
    ├── main.py                    # FastAPI app + prediction cache (6hr TTL)
    ├── model.py                   # Prophet model + DB query
    └── requirements.txt           # Python dependencies
```

---

## 🗄️ Database Schema

```sql
-- Crops reference table
crops (id, name, name_hindi, name_telugu, unit, created_at)

-- Mandi (market) locations
mandis (id, name, district, state, created_at)

-- Daily price records — unique per crop+mandi+date
prices (
  id, crop_id, mandi_id,
  min_price, max_price, modal_price,   -- from Agmarknet
  predicted_price, predicted_lower,    -- from Prophet ML
  predicted_upper, predicted_at,
  price_date, created_at
)

-- Farmer WhatsApp subscribers
farmers (id, phone, name, preferred_crop_id, preferred_mandi_id, subscribed, created_at)

-- WhatsApp conversation history
whatsapp_logs (id, phone, incoming_message, outgoing_message, created_at)

-- WhatsApp bot session state (multi-turn conversations)
whatsapp_sessions (phone, step, intent, crop_name, district_name, city_name, market_name, updated_at)

-- Admin users
admins (id, username, password_hash)

-- Web push subscriptions
push_subscriptions (endpoint, auth, p256dh, subscription_json, created_at, updated_at)
```

---

## 🔌 API Reference

All endpoints are prefixed with the base URL: `https://kisanrate-backend.onrender.com`

### Prices

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/prices` | ❌ | Get prices, filter by `?crop=&district=&state=` |
| `GET` | `/api/prices/crops` | ❌ | List all crops |
| `GET` | `/api/prices/mandis` | ❌ | List all mandis |
| `GET` | `/api/prices/history/:cropId/:mandiId` | ❌ | 30-day price history |
| `GET` | `/api/prices/analytics` | 🔑 Admin | Analytics data |
| `POST` | `/api/prices/manual` | 🔑 Admin | Add manual price entry |
| `POST` | `/api/prices/refresh-predictions` | 🔑 Admin | Refresh AI predictions for all prices |
| `POST` | `/api/prices/predict-now` | 🔑 Admin | Run predictions for a state |
| `POST` | `/api/prices/clear-stale-predictions` | 🔑 Admin | Clear zero/stale predictions |

### Auth

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Login → returns JWT token |

### Farmers

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/farmers` | 🔑 Admin | List all registered farmers |
| `POST` | `/api/farmers/subscribe` | ❌ | Subscribe a farmer via the web form |
| `PATCH` | `/api/farmers/:id` | 🔑 Admin | Update farmer (e.g. toggle subscription) |
| `DELETE` | `/api/farmers/:id` | 🔑 Admin | Delete a farmer |

### WhatsApp

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/whatsapp/webhook` | Twilio | Incoming WhatsApp message handler |
| `GET` | `/api/whatsapp/logs` | 🔑 Admin | Paginated conversation logs |

### Alerts

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/alerts/test` | 🔑 Admin | Send test alert to all subscribers |

### Push Notifications

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/push/vapid-public-key` | Get VAPID public key for browser subscription |
| `POST` | `/api/push/subscribe` | Save browser push subscription |

### ML Service (Internal)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/predict` | `{ crop, mandi }` → `{ predicted_price, predicted_lower, predicted_upper, prediction_date }` |

---

## 📱 WhatsApp Bot

The bot runs on Twilio's WhatsApp Sandbox and handles multi-turn conversations via a session state machine stored in `whatsapp_sessions`.

**How to connect:**
1. Save the Twilio sandbox number
2. Send `HI` to start
3. Follow the bot's prompts to query prices or subscribe

**Conversation flows:**

```
User: HI
Bot: Welcome to KisanRate! Send crop + location (e.g. "Tomato Chennai")
     or type SUBSCRIBE / STOP

User: Tomato Koyambedu
Bot: 🌾 Tomato @ Koyambedu
     Today: ₹2,450/quintal
     Min: ₹2,100 | Max: ₹2,780
     AI Prediction (tomorrow): ₹2,520

User: SUBSCRIBE Tomato Koyambedu
Bot: ✅ You're subscribed! You'll receive daily price alerts.

User: STOP
Bot: ✅ Unsubscribed. Send HI to resubscribe anytime.
```

**Webhook:** `POST /api/whatsapp/webhook` — registered in Twilio console.  
**Rate limit:** 20 requests/minute per IP.

---

## 🤖 ML Prediction Engine

**Location:** `ml/` — deployed as a separate FastAPI service.

**How it works:**

```
1. Server calls POST /predict with { crop, mandi }
2. ML service queries the last 90 days of price history from MySQL
3. If < 14 data points → returns simple average with ±5% range
4. If ≥ 14 data points → runs Facebook Prophet:
   - Fits time-series model on historical modal prices
   - Generates 7-day forecast
   - Returns next-day yhat (prediction) + yhat_lower + yhat_upper
5. Result is cached in-memory for 6 hours (TTL) to avoid redundant fits
```

**Retry logic (server-side):**  
The ML service on Render's free tier may cold-start. The server automatically retries with delays of `60s → 15s → 20s` for network/gateway errors before giving up.

**Prophet config:**
```python
Prophet(daily_seasonality=False, yearly_seasonality=False, uncertainty_samples=50)
```

---

## ⏰ Background Jobs

Both jobs run inside the Express server process via `node-cron`.

| Job | Schedule | What it does |
|---|---|---|
| `fetchPrices` | `0 6 * * *` (6AM daily) | Calls Agmarknet API → upserts new price records → emits `prices_updated` Socket.io event |
| `sendAlerts` | `0 7 * * *` (7AM daily) | Queries subscribed farmers → fetches their crop prices → sends WhatsApp alert via Twilio |
| `keepAlive` | `*/10 * * * *` (every 10 min) | Pings backend + ML service URLs to prevent Render free-tier sleep |

---

## 🖥️ Admin Dashboard

**URL:** `/admin` (requires login at `/login`)  
**Default credentials:** `admin` / `admin123` — **change these in production!**

Authentication uses **JWT tokens** stored in `localStorage`. The token is sent as a `Bearer` header on all admin API calls.

**Tabs:**

| Tab | Key actions |
|---|---|
| **Prices** | Stat cards (total entries, with predictions, today's data, stale). Fetch prices now, clear stale predictions, refresh AI predictions. Manual price entry form. Full price table. |
| **Analytics** | Charts from `/api/prices/analytics` |
| **Farmers** | Table with toggle subscribe/pause and delete. |
| **WhatsApp Logs** | Paginated (20/page) conversation history |
| **Alerts** | Trigger test WhatsApp alert to all active subscribers |

---

## 🔑 Environment Variables

Copy `.env.example` to `.env` and fill in all values.

### Client (`client/.env`)
```env
REACT_APP_API_URL=http://localhost:4000
REACT_APP_SOCKET_URL=http://localhost:4000
REACT_APP_WHATSAPP_SANDBOX_NUMBER=+14155238886
REACT_APP_WHATSAPP_JOIN_CODE=your_join_code
```

### Server (`server/.env`)
```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=kisanrate
DB_PORT=3306

# Auth
JWT_SECRET=your_super_secret_jwt_key_min_32_chars

# Twilio WhatsApp
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Agmarknet
AGMARKNET_API_KEY=your_agmarknet_api_key
AGMARKNET_STATES=Tamil Nadu

# ML Service
ML_SERVICE_URL=http://localhost:8000

# Web Push (VAPID)
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key

# Server
PORT=4000
```

### ML (`ml/.env`)
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=kisanrate
DB_PORT=3306
```

> **Generate VAPID keys:**  
> ```bash
> npx web-push generate-vapid-keys
> ```

---

## 🐳 Local Setup — Docker (Recommended)

The easiest way to run the full stack locally. Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
# 1. Clone the repo
git clone https://github.com/sharvesh-Srinivasan/KisanRate.git
cd KisanRate

# 2. Set up environment
cp .env.example .env
# Edit .env and fill in: JWT_SECRET, TWILIO_*, AGMARKNET_API_KEY, VAPID_*

# 3. Start everything (MySQL + ML + Server + Client)
docker compose up --build

# 4. Seed the database (first time only)
docker compose exec server node seed.js
```

**Services available:**

| Service | URL |
|---|---|
| React app | http://localhost:3000 |
| Express API | http://localhost:4000 |
| FastAPI ML | http://localhost:8000 |
| MySQL | localhost:3306 |

**Common commands:**
```bash
docker compose up          # Start all services
docker compose up --build  # Rebuild images first
docker compose down        # Stop all services
docker compose down -v     # Stop and delete MySQL data volume
docker compose logs -f server  # Follow server logs
```

---

## 🔧 Local Setup — Manual

> Requires: Node.js 20+, Python 3.11+, MySQL 8.0

### 1. Database
```bash
mysql -u root -p < schema.sql
```

### 2. Server
```bash
cd server
cp .env.example .env   # fill in values
npm install
node seed.js           # seed initial data (first time only)
npm run dev            # starts on port 4000
```

### 3. ML Service
```bash
cd ml
cp .env.example .env   # fill in DB values
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 4. Client
```bash
cd client
cp .env.example .env   # set REACT_APP_API_URL=http://localhost:4000
npm install
npm start              # starts on port 3000
```

---

## 🐋 Docker Reference

### Images

| Image | Base | Size strategy |
|---|---|---|
| `kisanrate-server` | `node:20-alpine` | `npm ci --omit=dev` — no devDependencies |
| `kisanrate-ml` | `python:3.11-slim` | Multi-stage: install in builder, copy packages to runner |
| `kisanrate-client` | `node:20-alpine` → `nginx:1.27-alpine` | Multi-stage: build in Node, serve compiled assets in Nginx |

### Nginx (client)
The Nginx config (`client/nginx.conf`) handles:
- **SPA routing** — all paths fall back to `index.html`
- **Gzip compression** — JS, CSS, SVG, fonts
- **Asset caching** — hashed bundles get 1-year `Cache-Control: immutable`
- **Security headers** — `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`

### Health checks
Each service in `docker-compose.yml` has a health check. Start order is enforced:
```
db (healthy) → ml (healthy) → server → client
```

---

## ⚙️ CI/CD Pipeline

Two GitHub Actions workflows manage quality and deployment.

### `ci.yml` — Runs on every PR and non-main branch push

```
PR opened
    │
    ├── lint-server   → npm ci + npm test --if-present
    ├── lint-client   → npm ci + react-scripts test --passWithNoTests
    ├── lint-ml       → pip install + py_compile (syntax check)
    │
    └── docker-build  → Build all 3 Docker images (validates Dockerfiles — no push)
```

### `deploy.yml` — Runs on push to `main` only

```
Push to main
    │
    ├── build-push (server + ml in parallel)
    │       ├── Login to GHCR with GITHUB_TOKEN (automatic — no manual setup)
    │       ├── Build Docker image
    │       └── Push with tags:
    │               :latest     ← always latest main
    │               :sha-abc123 ← for rollbacks
    │
    └── deploy-render (after images are pushed)
            ├── POST → RENDER_DEPLOY_HOOK_SERVER
            └── POST → RENDER_DEPLOY_HOOK_ML

Vercel auto-deploys client independently on every push ✅
```

### GitHub Secrets required

Go to: **GitHub → Repo → Settings → Secrets and variables → Actions**

| Secret | Description |
|---|---|
| `RENDER_DEPLOY_HOOK_SERVER` | Render deploy hook URL for `kisanrate-backend` |
| `RENDER_DEPLOY_HOOK_ML` | Render deploy hook URL for `kisanrate-ml` |

> `GITHUB_TOKEN` for GHCR is injected automatically — no setup needed.

### Image Registry

Docker images are stored at:
- `ghcr.io/sharvesh-srinivasan/kisanrate-server:latest`
- `ghcr.io/sharvesh-srinivasan/kisanrate-ml:latest`

---

## 🚀 Deployment

| Service | Platform | URL |
|---|---|---|
| Frontend (React) | Vercel | https://kisanrate.vercel.app |
| Backend (Express) | Render | https://kisanrate-backend.onrender.com |
| ML Service (FastAPI) | Render | https://kisanrate-ml.onrender.com |
| Database | Render (MySQL) | Internal |

**Twilio webhook URL:**  
`https://kisanrate-backend.onrender.com/api/whatsapp/webhook`  
→ Register this in your Twilio console under the WhatsApp sandbox settings.

**Render note:**  
On the free tier, services sleep after 15 minutes of inactivity. A keep-alive cron job pings both services every 10 minutes to prevent cold starts.

---

## 🔒 Security

| Measure | Details |
|---|---|
| **Parameterized queries** | All DB queries use `?` placeholders — no SQL injection possible |
| **JWT authentication** | Admin routes protected with `Authorization: Bearer <token>` |
| **Password hashing** | Admin passwords hashed with bcrypt (10 rounds) |
| **Rate limiting** | WhatsApp webhook: 20 req/min per IP via `express-rate-limit` |
| **CORS** | Whitelist of `kisanrate.vercel.app` + `*.vercel.app` + `localhost:3000` |
| **Non-root Docker** | All containers run as a non-root `kisanrate` user |
| **No secrets in images** | `.dockerignore` excludes `.env` files; runtime env injected via compose/Render |
| **HTTPS only** | All production URLs use HTTPS (enforced by Render + Vercel) |

---

## 📄 License

This project was built as a research project. All rights reserved.

---

<div align="center">
Built with ❤️ for Indian farmers · <a href="https://kisanrate.vercel.app">kisanrate.vercel.app</a>
</div>
