# KisanRate

KisanRate is a hyperlocal crop price discovery and prediction platform for farmers in India. Farmers can query prices via WhatsApp, while the public can view live mandi prices on a web dashboard.

## Tech Stack
- Frontend: React + Tailwind CSS + Recharts
- Backend: Node.js + Express.js
- Database: MySQL (mysql2 with SSL)
- Real-time: Socket.io
- WhatsApp: Twilio WhatsApp API (webhook-based)
- ML: FastAPI + Prophet
- Jobs: node-cron

## Project Structure
- client: React app
- server: Express API + cron jobs + Socket.io
- ml: FastAPI prediction service
- schema.sql: MySQL schema

## Environment Variables
Copy .env.example and populate values for client, server, and ml. Use the same DB_* values for both server and ml.

## Local Setup (Suggested)
1. Create database in MySQL and run schema.sql
2. Run `node server/seed.js`
3. Start backend
4. Start ML service
5. Start client

## Deployment Summary
- Frontend (Vercel): https://kisanrate.vercel.app
- Backend (Render): https://kisanrate-backend.onrender.com
- ML (Render): https://kisanrate-ml.onrender.com
- Twilio webhook: https://kisanrate-backend.onrender.com/api/whatsapp/webhook

## WhatsApp Bot
- Send `HI` to the Twilio WhatsApp number to see commands
- Example query: `Tomato Warangal`
- Subscribe: `SUBSCRIBE Tomato Warangal`
- Stop: `STOP`

## Admin Panel
- Login at /login
- Default admin: admin / admin123

## Notes
- All DB queries use parameterized placeholders
- WhatsApp webhook is rate-limited to 20 requests/minute per IP
