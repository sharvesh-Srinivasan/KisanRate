const cron = require("node-cron");
const db = require("../config/db");
const { sendWhatsAppMessage } = require("../services/twilioService");
const { getPrediction } = require("../services/mlService");
const { sendPushToAll } = require("../controllers/pushController");
const { checkRainForecast } = require("../services/weatherService");

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
      `SELECT id, phone, name, preferred_crop_id, preferred_mandi_id, district
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

      // Check MSP
      const [mspRows] = await db.query(
        "SELECT msp_price FROM msp_rates WHERE crop_id = ? AND effective_year = ?",
        [farmer.preferred_crop_id, new Date().getFullYear()]
      );
      
      let mspWarning = "";
      if (mspRows.length && Number(price.modal_price) < Number(mspRows[0].msp_price)) {
         mspWarning = `\n⚠️ ALERT: Price (Rs ${price.modal_price}) has dropped below govt MSP of Rs ${mspRows[0].msp_price}. You can legally sell at MSP via govt procurement centers.`;
      }

      const reply =
        `Good morning ${name}!\n` +
        `Today's ${price.crop_name} at ${price.mandi_name}: ` +
        `Rs ${Number(price.modal_price).toLocaleString("en-IN")}/Quintal\n` +
        `Expected next week: Rs ${Number(predictedPrice).toLocaleString("en-IN")}/Quintal` +
        mspWarning + `\nReply STOP to unsubscribe.`;

      await sendWhatsAppMessage(farmer.phone, reply);
    }

    // Weather Alerts for Farmers with Stock
    const [stockFarmers] = await db.query(
      `SELECT DISTINCT f.id, f.phone, f.name, f.district, c.name AS crop_name
       FROM farmers f
       JOIN farmer_stock fs ON f.id = fs.farmer_id
       JOIN crops c ON fs.crop_id = c.id
       WHERE fs.quantity_quintals > 0 AND f.district IS NOT NULL AND f.phone IS NOT NULL`
    );

    const districtWeather = {};
    for (const sf of stockFarmers) {
      if (!districtWeather[sf.district]) {
        districtWeather[sf.district] = await checkRainForecast(sf.district);
      }
      const weather = districtWeather[sf.district];
      if (weather.isRainExpected) {
        const msg = `🌧️ Heavy rain expected in ${sf.district} for next 3 days. Consider harvesting and selling your ${sf.crop_name} to avoid spoilage.`;
        await sendWhatsAppMessage(sf.phone, msg);
      }
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
