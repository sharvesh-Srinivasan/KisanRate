const cron = require("node-cron");
const db = require("../config/db");
const { sendWhatsAppMessage } = require("../services/twilioService");
const { getPrediction } = require("../services/mlService");
const { sendPushToAll } = require("../controllers/pushController");

const timestamp = () => new Date().toISOString();
const logWarn = (message) => {
  process.stderr.write(`[WARN] ${timestamp()} ${message}\n`);
};

const getTodayPriceByIds = async (cropId, mandiId) => {
  const [rows] = await db.query(
    `SELECT p.modal_price, c.name AS crop_name, m.name AS mandi_name
     FROM prices p
     JOIN crops c ON p.crop_id = c.id
     JOIN mandis m ON p.mandi_id = m.id
     WHERE p.price_date = CURDATE() AND p.crop_id = ? AND p.mandi_id = ?
     LIMIT 1`,
    [cropId, mandiId]
  );
  return rows[0] || null;
};

const sendAlertsNow = async () => {
  try {
    const [farmers] = await db.query(
      `SELECT id, phone, name, preferred_crop_id, preferred_mandi_id
       FROM farmers
       WHERE subscribed = TRUE
         AND preferred_crop_id IS NOT NULL
         AND preferred_mandi_id IS NOT NULL`
    );

    for (const farmer of farmers) {
      const price = await getTodayPriceByIds(
        farmer.preferred_crop_id,
        farmer.preferred_mandi_id
      );
      if (!price) continue;

      const predicted = await getPrediction(price.crop_name, price.mandi_name);
      const predictedPrice = predicted?.predicted_price ?? price.modal_price;
      const name = farmer.name || "farmer";
      const reply =
        `Good morning ${name}!\n` +
        `Today's ${price.crop_name} at ${price.mandi_name}: ` +
        `Rs ${Number(price.modal_price).toLocaleString("en-IN")}/Quintal\n` +
        `Expected next week: Rs ${Number(predictedPrice).toLocaleString("en-IN")}/Quintal\n` +
        "Reply STOP to unsubscribe.";

      await sendWhatsAppMessage(farmer.phone, reply);
    }

    // Also push to browser subscribers with a summary
    await sendPushToAll({
      title: "KisanRate — Today's Prices",
      body: "Today's crop prices have been updated. Tap to view the latest rates.",
      url: "/"
    });
  } catch (error) {
    logWarn(`Send alerts job failed: ${error.message}`);
  }
};

const startSendAlertsJob = () => {
  cron.schedule("0 7 * * *", sendAlertsNow, { timezone: "Asia/Kolkata" });
};

module.exports = { startSendAlertsJob, sendAlertsNow };
