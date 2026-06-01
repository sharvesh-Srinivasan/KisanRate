require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const db = require("./config/db");
const { initSocket } = require("./socket/socketHandler");
const priceRoutes = require("./routes/priceRoutes");
const farmerRoutes = require("./routes/farmerRoutes");
const alertRoutes = require("./routes/alertRoutes");
const whatsappRoutes = require("./routes/whatsappRoutes");
const { startFetchPricesJob } = require("./jobs/fetchPrices");
const { startSendAlertsJob } = require("./jobs/sendAlerts");

const timestamp = () => new Date().toISOString();
const logInfo = (message) => {
  process.stdout.write(`[INFO] ${timestamp()} ${message}\n`);
};
const logWarn = (message) => {
  process.stderr.write(`[WARN] ${timestamp()} ${message}\n`);
};

const app = express();
const server = http.createServer(app);

const ensurePredictionColumns = async () => {
  const [rows] = await db.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'prices' AND COLUMN_NAME IN ('predicted_price', 'predicted_lower', 'predicted_upper', 'predicted_at')`,
    [process.env.DB_NAME]
  );

  const existing = new Set(rows.map((row) => row.COLUMN_NAME));
  if (!existing.has("predicted_price")) {
    await db.query("ALTER TABLE prices ADD COLUMN predicted_price DECIMAL(10,2)");
  }
  if (!existing.has("predicted_lower")) {
    await db.query("ALTER TABLE prices ADD COLUMN predicted_lower DECIMAL(10,2)");
  }
  if (!existing.has("predicted_upper")) {
    await db.query("ALTER TABLE prices ADD COLUMN predicted_upper DECIMAL(10,2)");
  }
  if (!existing.has("predicted_at")) {
    await db.query("ALTER TABLE prices ADD COLUMN predicted_at DATETIME");
  }
};

const ensureWhatsAppSessionsTable = async () => {
  await db.query(
    `CREATE TABLE IF NOT EXISTS whatsapp_sessions (
      phone VARCHAR(20) PRIMARY KEY,
      step VARCHAR(40) NOT NULL,
      intent VARCHAR(20) NOT NULL,
      crop_name VARCHAR(100),
      district_name VARCHAR(100),
      city_name VARCHAR(100),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`
  );
};

const allowedOrigins = new Set([
  "https://kisanrate.vercel.app",
  "https://kisan-rate.vercel.app",
  "http://localhost:3000"
]);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    if (origin.endsWith(".vercel.app")) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Username and password are required"
      });
    }

    const [rows] = await db.query(
      "SELECT id, username, password_hash FROM admins WHERE username = ?",
      [username]
    );

    if (!rows.length) {
      return res.status(401).json({
        success: false,
        data: null,
        message: "Invalid username or password"
      });
    }

    const admin = rows[0];
    const passwordMatch = await bcrypt.compare(password, admin.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        data: null,
        message: "Invalid username or password"
      });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      data: { token },
      message: "Login successful"
    });
  } catch (error) {
    logWarn(`Auth login failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      data: null,
      message: "Login failed"
    });
  }
});

app.use("/api/prices", priceRoutes);
app.use("/api/farmers", farmerRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/whatsapp", whatsappRoutes);

initSocket(server, corsOptions);
startFetchPricesJob();
startSendAlertsJob();

ensurePredictionColumns().catch((error) => {
  logWarn(`Prediction cache setup failed: ${error.message}`);
});

ensureWhatsAppSessionsTable().catch((error) => {
  logWarn(`WhatsApp session setup failed: ${error.message}`);
});

const keepAliveTargets = [
  "https://kisanrate-backend.onrender.com/api/prices/crops",
  "https://kisanrate-ml.onrender.com/health"
];

const keepAliveTask = () => {
  keepAliveTargets.forEach((url) => {
    axios.get(url).catch(() => {});
  });
};

const cron = require("node-cron");
cron.schedule("*/14 * * * *", keepAliveTask);

const PORT = Number(process.env.PORT || 4000);
server.listen(PORT, () => {
  logInfo(`Server running on port ${PORT}`);
});
