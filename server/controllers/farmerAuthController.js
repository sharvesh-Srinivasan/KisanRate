const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const { sendOtp } = require("../services/fast2smsService");

const timestamp = () => new Date().toISOString();
const logInfo = (msg) => process.stdout.write(`[INFO] ${timestamp()} ${msg}\n`);
const logWarn = (msg) => process.stderr.write(`[WARN] ${timestamp()} ${msg}\n`);

/** Normalize Indian phone — strip country code, keep 10 digits */
const normalizePhone = (raw) =>
  String(raw || "")
    .replace(/\D/g, "")
    .replace(/^91/, "")
    .slice(-10);

/** Generate a cryptographically random 6-digit OTP */
const generateOtp = () =>
  String(Math.floor(100000 + Math.random() * 900000));

// ── Send OTP ──────────────────────────────────────────────────────────────────

const sendOtpHandler = async (req, res) => {
  try {
    const { phone } = req.body || {};
    const normalized = normalizePhone(phone);

    if (!normalized || normalized.length !== 10) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Please enter a valid 10-digit mobile number"
      });
    }

    // Rate-limit: one OTP per 60 seconds per phone
    const [existing] = await db.query(
      "SELECT expires_at FROM farmer_otp WHERE phone = ?",
      [normalized]
    );

    if (existing.length) {
      const expiresAt = new Date(existing[0].expires_at);
      const createdAt = new Date(expiresAt.getTime() - 5 * 60 * 1000); // OTP lives 5 min
      const secondsSinceCreated = (Date.now() - createdAt.getTime()) / 1000;

      if (secondsSinceCreated < 60) {
        const waitSeconds = Math.ceil(60 - secondsSinceCreated);
        return res.status(429).json({
          success: false,
          data: null,
          message: `Please wait ${waitSeconds}s before requesting another OTP`
        });
      }
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Upsert OTP record
    await db.query(
      `INSERT INTO farmer_otp (phone, otp_hash, expires_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE otp_hash = VALUES(otp_hash), expires_at = VALUES(expires_at)`,
      [normalized, otpHash, expiresAt]
    );

    // Check if new user
    const [existingFarmer] = await db.query(
      "SELECT id FROM farmers WHERE phone = ? LIMIT 1",
      [normalized]
    );
    const isNewUser = existingFarmer.length === 0;

    const result = await sendOtp(normalized, otp);

    logInfo(`OTP ${result.devMode ? "(DEV)" : ""} requested for ${normalized.slice(0, 4)}**** (New: ${isNewUser})`);

    return res.json({
      success: true,
      data: { 
        devMode: result.devMode,
        demoOtp: result.devMode ? otp : undefined,
        isNewUser
      },
      message: result.devMode
        ? "Demo Mode Active. Check the alert to see your OTP."
        : "OTP sent to your mobile number"
    });
  } catch (error) {
    logWarn(`sendOtp failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      data: null,
      message: error.message || "Failed to send OTP"
    });
  }
};

// ── Verify OTP ─────────────────────────────────────────────────────────────────

const verifyOtpHandler = async (req, res) => {
  try {
    const { phone, otp, name, district } = req.body || {};
    const normalized = normalizePhone(phone);

    if (!normalized || !otp) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Phone and OTP are required"
      });
    }

    // Fetch OTP record
    const [rows] = await db.query(
      "SELECT otp_hash, expires_at FROM farmer_otp WHERE phone = ?",
      [normalized]
    );

    if (!rows.length) {
      return res.status(401).json({
        success: false,
        data: null,
        message: "OTP not found. Please request a new OTP."
      });
    }

    const { otp_hash, expires_at } = rows[0];

    // Check expiry
    if (new Date(expires_at) < new Date()) {
      await db.query("DELETE FROM farmer_otp WHERE phone = ?", [normalized]);
      return res.status(401).json({
        success: false,
        data: null,
        message: "OTP has expired. Please request a new OTP."
      });
    }

    // Verify hash
    const valid = await bcrypt.compare(String(otp).trim(), otp_hash);
    if (!valid) {
      return res.status(401).json({
        success: false,
        data: null,
        message: "Invalid OTP. Please check and try again."
      });
    }

    // Consume OTP
    await db.query("DELETE FROM farmer_otp WHERE phone = ?", [normalized]);

    // Upsert farmer record
    const [existingFarmer] = await db.query(
      "SELECT id, name, district FROM farmers WHERE phone = ? LIMIT 1",
      [normalized]
    );

    let farmerId;
    let farmerName;
    let farmerDistrict;

    if (existingFarmer.length) {
      farmerId = existingFarmer[0].id;
      farmerName = existingFarmer[0].name;
      farmerDistrict = existingFarmer[0].district;
      // Do not overwrite existing profile details on login
    } else {
      const [result] = await db.query(
        `INSERT INTO farmers (phone, name, district, subscribed) VALUES (?, ?, ?, TRUE)`,
        [normalized, name || null, district || null]
      );
      farmerId = result.insertId;
      farmerName = name || null;
      farmerDistrict = district || null;
    }

    // Issue JWT
    const token = jwt.sign(
      { farmerId, phone: normalized, role: "farmer" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    logInfo(`Farmer ${farmerId} logged in via OTP`);

    return res.json({
      success: true,
      data: {
        token,
        farmer: {
          id: farmerId,
          phone: normalized,
          name: farmerName,
          district: farmerDistrict
        }
      },
      message: "Login successful"
    });
  } catch (error) {
    logWarn(`verifyOtp failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      data: null,
      message: "Verification failed. Please try again."
    });
  }
};

// ── Profile ────────────────────────────────────────────────────────────────────

const getFarmerProfile = async (req, res) => {
  try {
    const { farmerId } = req.farmer;
    const [rows] = await db.query(
      `SELECT f.id, f.phone, f.name, f.district, f.subscribed,
              c.name AS preferred_crop_name,
              m.name AS preferred_mandi_name
       FROM farmers f
       LEFT JOIN crops c ON f.preferred_crop_id = c.id
       LEFT JOIN mandis m ON f.preferred_mandi_id = m.id
       WHERE f.id = ?`,
      [farmerId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, data: null, message: "Farmer not found" });
    }

    return res.json({ success: true, data: rows[0], message: "Profile fetched" });
  } catch (error) {
    logWarn(`getFarmerProfile failed: ${error.message}`);
    return res.status(500).json({ success: false, data: null, message: "Failed to fetch profile" });
  }
};

const updateFarmerProfile = async (req, res) => {
  try {
    const { farmerId } = req.farmer;
    const { name, district } = req.body || {};

    await db.query(
      `UPDATE farmers SET
         name = COALESCE(?, name),
         district = COALESCE(?, district)
       WHERE id = ?`,
      [name || null, district || null, farmerId]
    );

    return res.json({ success: true, data: null, message: "Profile updated" });
  } catch (error) {
    logWarn(`updateFarmerProfile failed: ${error.message}`);
    return res.status(500).json({ success: false, data: null, message: "Failed to update profile" });
  }
};

module.exports = { sendOtpHandler, verifyOtpHandler, getFarmerProfile, updateFarmerProfile };
