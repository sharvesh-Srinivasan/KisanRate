const twilio = require("twilio");

const timestamp = () => new Date().toISOString();
const logWarn = (message) => {
  process.stderr.write(`[WARN] ${timestamp()} ${message}\n`);
};

const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
const authToken = process.env.TWILIO_AUTH_TOKEN || "";
const hasTwilioCreds = accountSid.startsWith("AC") && authToken.length > 0;

let client = null;
if (hasTwilioCreds) {
  client = twilio(accountSid, authToken);
} else {
  logWarn("Twilio credentials missing or invalid; WhatsApp alerts disabled");
}

const normalizeIndianNumber = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  const trimmed = digits.startsWith("91") ? digits.slice(2) : digits;
  return `whatsapp:+91${trimmed}`;
};

const sendWhatsAppMessage = async (to, message) => {
  try {
    if (!client) {
      return null;
    }
    const toNumber = normalizeIndianNumber(to);
    return await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: toNumber,
      body: message
    });
  } catch (error) {
    logWarn(`Twilio send failed: ${error.message}`);
    return null;
  }
};

module.exports = { sendWhatsAppMessage };
