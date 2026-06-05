const axios = require("axios");

const timestamp = () => new Date().toISOString();
const logInfo = (msg) => process.stdout.write(`[INFO] ${timestamp()} ${msg}\n`);
const logWarn = (msg) => process.stderr.write(`[WARN] ${timestamp()} ${msg}\n`);

/**
 * Send a 6-digit OTP to an Indian mobile number via Fast2SMS.
 * If FAST2SMS_API_KEY is not set, the OTP is printed to console (dev mode).
 * @param {string} phone  — 10-digit Indian mobile number (no country code)
 * @param {string} otp    — 6-digit OTP string
 * @returns {Promise<{ sent: boolean, devMode: boolean }>}
 */
const sendOtp = async (phone, otp) => {
  const apiKey = process.env.FAST2SMS_API_KEY;

  if (!apiKey) {
    // Dev mode — print OTP to server console so testing works locally
    logInfo(`[DEV OTP] Phone: ${phone}  OTP: ${otp}`);
    return { sent: true, devMode: true };
  }

  try {
    const message = `Your KisanRate OTP is ${otp}. Valid for 5 minutes. Do not share with anyone.`;

    const response = await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      {
        route: "q",              // quick/transactional route
        message,
        language: "english",
        flash: 0,
        numbers: phone
      },
      {
        headers: {
          authorization: apiKey,
          "Content-Type": "application/json"
        },
        timeout: 8000
      }
    );

    if (response.data && response.data.return === true) {
      logInfo(`OTP sent to ${phone.slice(0, 4)}***${phone.slice(-3)}`);
      return { sent: true, devMode: false };
    }

    logWarn(`Fast2SMS unexpected response: ${JSON.stringify(response.data)}`);
    return { sent: false, devMode: false };
  } catch (error) {
    logWarn(`Fast2SMS send failed: ${error.message}`);
    throw new Error("Failed to send OTP. Please try again.");
  }
};

module.exports = { sendOtp };
