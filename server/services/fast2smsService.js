const axios = require("axios");

const timestamp = () => new Date().toISOString();
const logInfo  = (msg) => process.stdout.write(`[INFO] ${timestamp()} ${msg}\n`);
const logWarn  = (msg) => process.stderr.write(`[WARN] ${timestamp()} ${msg}\n`);

const FAST2SMS_KEY = process.env.FAST2SMS_API_KEY || "";

/**
 * Send OTP via Fast2SMS Quick SMS route (route=q).
 * Quick SMS sends plain text — no DLT template approval required.
 *
 * API docs: https://docs.fast2sms.com/#quick-sms
 */
const sendOtp = async (phone, otp) => {
  // ── Dev fallback if no API key ─────────────────────────────────────────────
  if (!FAST2SMS_KEY) {
    logInfo(`[DEMO OTP] No FAST2SMS_API_KEY found. Phone: ${phone}  OTP: ${otp}`);
    return { sent: true, devMode: true };
  }

  try {
    const message = `Your KisanRate OTP is ${otp}. Valid for 5 minutes. Do not share this with anyone.`;

    const response = await axios.get("https://www.fast2sms.com/dev/bulkV2", {
      params: {
        authorization: FAST2SMS_KEY,
        route: "q",           // Quick SMS — no DLT required
        message,              // plain text message
        flash: "0",           // 0 = normal SMS, 1 = flash (appears on screen directly)
        numbers: phone        // 10-digit Indian mobile number
      },
      timeout: 10000
    });

    const data = response.data;

    if (data && data.return === true) {
      logInfo(`[Fast2SMS] OTP sent to ${phone.slice(0, 4)}****`);
      return { sent: true, devMode: false };
    } else {
      const errMsg = Array.isArray(data?.message)
        ? data.message.join(" ")
        : (data?.message || JSON.stringify(data));
      logWarn(`[Fast2SMS] API error: ${errMsg}`);

      // Fall back to devMode so dev/testing never breaks
      logInfo(`[DEMO OTP FALLBACK] Phone: ${phone}  OTP: ${otp}`);
      return { sent: true, devMode: true };
    }
  } catch (err) {
    const detail = err.response?.data
      ? JSON.stringify(err.response.data)
      : err.message;
    logWarn(`[Fast2SMS] Request failed: ${detail}`);

    // Fall back to devMode
    logInfo(`[DEMO OTP FALLBACK] Phone: ${phone}  OTP: ${otp}`);
    return { sent: true, devMode: true };
  }
};

module.exports = { sendOtp };
