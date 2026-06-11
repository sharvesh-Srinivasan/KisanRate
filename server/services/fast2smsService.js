const axios = require("axios");

const timestamp = () => new Date().toISOString();
const logInfo = (msg) => process.stdout.write(`[INFO] ${timestamp()} ${msg}\n`);

/**
 * Mock OTP Service (Bypassing telecom restrictions for portfolio demo)
 * Always returns true and acts in devMode.
 */
const sendOtp = async (phone, otp) => {
  logInfo(`[DEMO OTP] Phone: ${phone}  OTP: ${otp}`);
  return { sent: true, devMode: true };
};

module.exports = { sendOtp };
