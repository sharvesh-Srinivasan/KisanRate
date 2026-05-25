const { sendAlertsNow } = require("../jobs/sendAlerts");

const timestamp = () => new Date().toISOString();
const logWarn = (message) => {
  process.stderr.write(`[WARN] ${timestamp()} ${message}\n`);
};

const triggerAlertTest = async (req, res) => {
  try {
    await sendAlertsNow();
    return res.json({
      success: true,
      data: null,
      message: "Alerts sent"
    });
  } catch (error) {
    logWarn(`Trigger alerts failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      data: null,
      message: "Failed to send alerts"
    });
  }
};

module.exports = { triggerAlertTest };
