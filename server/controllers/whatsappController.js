const { MessagingResponse } = require("twilio").twiml;
const db = require("../config/db");
const { getPrediction } = require("../services/mlService");
const { sendWhatsAppMessage } = require("../services/twilioService");

const timestamp = () => new Date().toISOString();
const logWarn = (message) => {
  process.stderr.write(`[WARN] ${timestamp()} ${message}\n`);
};

const normalizeIncomingPhone = (from) =>
  String(from || "")
    .replace("whatsapp:+91", "")
    .replace(/\D/g, "");

const logWhatsAppExchange = async (phone, incoming, outgoing) => {
  try {
    await db.query(
      "INSERT INTO whatsapp_logs (phone, incoming_message, outgoing_message) VALUES (?, ?, ?)",
      [phone, incoming, outgoing]
    );
  } catch (error) {
    logWarn(`WhatsApp log failed: ${error.message}`);
  }
};

const getSession = async (phone) => {
  const [rows] = await db.query(
    "SELECT phone, step, intent, crop_name, district_name, city_name FROM whatsapp_sessions WHERE phone = ? LIMIT 1",
    [phone]
  );
  return rows[0] || null;
};

const saveSession = async (phone, data) => {
  const payload = {
    step: data.step || "",
    intent: data.intent || "",
    cropName: data.cropName || null,
    districtName: data.districtName || null,
    cityName: data.cityName || null
  };

  await db.query(
    "INSERT INTO whatsapp_sessions (phone, step, intent, crop_name, district_name, city_name) VALUES (?, ?, ?, ?, ?, ?) " +
      "ON DUPLICATE KEY UPDATE step = VALUES(step), intent = VALUES(intent), crop_name = VALUES(crop_name), district_name = VALUES(district_name), city_name = VALUES(city_name)",
    [
      phone,
      payload.step,
      payload.intent,
      payload.cropName,
      payload.districtName,
      payload.cityName
    ]
  );
};

const clearSession = async (phone) => {
  await db.query("DELETE FROM whatsapp_sessions WHERE phone = ?", [phone]);
};

const fetchTodayPrice = async (cropName, districtName) => {
  const [rows] = await db.query(
    `SELECT p.modal_price, p.min_price, p.max_price, p.crop_id, p.mandi_id,
            c.name AS crop_name, m.name AS mandi_name, m.district
     FROM prices p
     JOIN crops c ON p.crop_id = c.id
     JOIN mandis m ON p.mandi_id = m.id
     WHERE p.price_date = CURDATE()
       AND c.name LIKE ?
       AND m.district LIKE ?
     ORDER BY p.modal_price DESC
     LIMIT 1`,
    [`%${cropName}%`, `%${districtName}%`]
  );
  return rows[0] || null;
};

const fetchTodayPriceByTown = async (cropName, districtName, townName) => {
  const [rows] = await db.query(
    `SELECT p.modal_price, p.min_price, p.max_price, p.crop_id, p.mandi_id,
            c.name AS crop_name, m.name AS mandi_name, m.district
     FROM prices p
     JOIN crops c ON p.crop_id = c.id
     JOIN mandis m ON p.mandi_id = m.id
     WHERE p.price_date = CURDATE()
       AND c.name LIKE ?
       AND m.district LIKE ?
       AND m.name LIKE ?
     ORDER BY p.modal_price DESC
     LIMIT 1`,
    [`%${cropName}%`, `%${districtName}%`, `%${townName}%`]
  );
  return rows[0] || null;
};

const findCropAndMandi = async (cropName, districtName) => {
  const [cropRows] = await db.query(
    "SELECT id, name FROM crops WHERE name LIKE ? LIMIT 1",
    [`%${cropName}%`]
  );
  const [mandiRows] = await db.query(
    "SELECT id, name FROM mandis WHERE district LIKE ? LIMIT 1",
    [`%${districtName}%`]
  );

  return {
    crop: cropRows[0] || null,
    mandi: mandiRows[0] || null
  };
};

const findCropByName = async (cropName) => {
  const [rows] = await db.query(
    "SELECT id, name FROM crops WHERE name LIKE ? LIMIT 1",
    [`%${cropName}%`]
  );
  return rows[0] || null;
};

const findMandiByDistrictTown = async (districtName, townName) => {
  const [rows] = await db.query(
    "SELECT id, name, district FROM mandis WHERE district LIKE ? AND name LIKE ? LIMIT 1",
    [`%${districtName}%`, `%${townName}%`]
  );
  return rows[0] || null;
};

const whatsappWebhook = async (req, res) => {
  const twiml = new MessagingResponse();
  try {
    const from = req.body.From;
    const messageBody = String(req.body.Body || "").trim();
    const phone = normalizeIncomingPhone(from);
    const upperMessage = messageBody.toUpperCase();

    if (!messageBody) {
      const reply = "Send HI to see available commands.";
      twiml.message(reply);
      await logWhatsAppExchange(phone, messageBody, reply);
      return res.type("text/xml").send(twiml.toString());
    }

    if (upperMessage === "HI" || upperMessage === "HELLO") {
      const reply =
        "Welcome to KisanRate!\n" +
        "Send: {crop} {location} - get today's price\n" +
        "Send: SUBSCRIBE {crop} {location} - get daily alerts\n" +
        "We'll ask for district, then city.\n" +
        "Send: STOP - unsubscribe\n" +
        "Send: RESET - start over";
      twiml.message(reply);
      await logWhatsAppExchange(phone, messageBody, reply);
      return res.type("text/xml").send(twiml.toString());
    }

    if (upperMessage === "RESET" || upperMessage === "CANCEL") {
      await clearSession(phone);
      const reply = "Reset done. Send crop name to start again.";
      twiml.message(reply);
      await logWhatsAppExchange(phone, messageBody, reply);
      return res.type("text/xml").send(twiml.toString());
    }

    if (upperMessage.startsWith("SUBSCRIBE ")) {
      const tokens = messageBody.split(" ");
      const cropName = tokens[1];

      if (!cropName) {
        const reply = "Please send: SUBSCRIBE {crop}. Example: SUBSCRIBE tomato";
        twiml.message(reply);
        await logWhatsAppExchange(phone, messageBody, reply);
        return res.type("text/xml").send(twiml.toString());
      }

      await saveSession(phone, {
        step: "awaiting_district",
        intent: "subscribe",
        cropName
      });

      const reply =
        `Got it — ${cropName} updates.\n` +
        "Which district are you in?\n" +
        "Example: Coimbatore, Erode, Tiruppur";
      twiml.message(reply);
      await logWhatsAppExchange(phone, messageBody, reply);
      return res.type("text/xml").send(twiml.toString());
    }

    if (upperMessage === "STOP") {
      await db.query("UPDATE farmers SET subscribed = FALSE WHERE phone = ?", [
        phone
      ]);
      await clearSession(phone);

      const reply = "You've been unsubscribed. Send HI to restart.";
      twiml.message(reply);
      await logWhatsAppExchange(phone, messageBody, reply);
      return res.type("text/xml").send(twiml.toString());
    }

    const activeSession = await getSession(phone);
    if (activeSession && activeSession.step === "awaiting_district") {
      const districtName = messageBody.trim();
      if (!districtName) {
        const reply = "Please reply with your district name.";
        twiml.message(reply);
        await logWhatsAppExchange(phone, messageBody, reply);
        return res.type("text/xml").send(twiml.toString());
      }

      await saveSession(phone, {
        step: "awaiting_city",
        intent: activeSession.intent,
        cropName: activeSession.crop_name,
        districtName
      });

      const reply =
        `Which city or town in ${districtName} district?\n` +
        "Example: Coimbatore City, Sulur, Pollachi";
      twiml.message(reply);
      await logWhatsAppExchange(phone, messageBody, reply);
      return res.type("text/xml").send(twiml.toString());
    }

    if (activeSession && activeSession.step === "awaiting_city") {
      const cityName = messageBody.trim();
      if (!cityName) {
        const reply = "Please reply with your city or town.";
        twiml.message(reply);
        await logWhatsAppExchange(phone, messageBody, reply);
        return res.type("text/xml").send(twiml.toString());
      }

      await saveSession(phone, {
        step: "awaiting_town",
        intent: activeSession.intent,
        cropName: activeSession.crop_name,
        districtName: activeSession.district_name,
        cityName
      });

      const reply =
        `Which town or locality in ${cityName}?\n` +
        "Example: Singanallur, R.S. Puram, Peelamedu";
      twiml.message(reply);
      await logWhatsAppExchange(phone, messageBody, reply);
      return res.type("text/xml").send(twiml.toString());
    }

    if (activeSession && activeSession.step === "awaiting_town") {
      const townName = messageBody.trim();
      if (!townName) {
        const reply = "Please reply with your town or locality.";
        twiml.message(reply);
        await logWhatsAppExchange(phone, messageBody, reply);
        return res.type("text/xml").send(twiml.toString());
      }

      const cropName = activeSession.crop_name;
      const districtName = activeSession.district_name;
      const cityName = activeSession.city_name;

      const crop = await findCropByName(cropName);
      if (!crop) {
        await clearSession(phone);
        const reply = `Could not find crop "${cropName}". Send the crop name again to restart.`;
        twiml.message(reply);
        await logWhatsAppExchange(phone, messageBody, reply);
        return res.type("text/xml").send(twiml.toString());
      }

      const mandi = await findMandiByDistrictTown(districtName, townName);
      if (!mandi) {
        const reply =
          `I couldn't find ${townName} in ${districtName} district.\n` +
          "Please reply with another town or locality.";
        twiml.message(reply);
        await logWhatsAppExchange(phone, messageBody, reply);
        return res.type("text/xml").send(twiml.toString());
      }

      const today = await fetchTodayPriceByTown(crop.name, districtName, townName);
      if (!today) {
        await clearSession(phone);
        const reply =
          `Confirmed: ${crop.name} in ${townName}, ${cityName}, ${districtName}.\n` +
          `No pricing data available for ${crop.name} in ${townName}, ${cityName}, ${districtName}. ` +
          "Please check the crop name or try another location.";
        twiml.message(reply);
        await logWhatsAppExchange(phone, messageBody, reply);
        return res.type("text/xml").send(twiml.toString());
      }

      if (activeSession.intent === "subscribe") {
        const [existing] = await db.query(
          "SELECT id FROM farmers WHERE phone = ? LIMIT 1",
          [phone]
        );

        if (existing.length) {
          await db.query(
            "UPDATE farmers SET preferred_crop_id = ?, preferred_mandi_id = ?, subscribed = TRUE WHERE phone = ?",
            [crop.id, mandi.id, phone]
          );
        } else {
          await db.query(
            "INSERT INTO farmers (phone, preferred_crop_id, preferred_mandi_id, subscribed) VALUES (?, ?, ?, TRUE)",
            [phone, crop.id, mandi.id]
          );
        }

        await clearSession(phone);

        const reply =
          `Confirmed: ${crop.name} in ${townName}, ${cityName}, ${districtName}.\n` +
          `Subscribed! Today's ${crop.name} at ${today.mandi_name}: ` +
          `Rs ${Number(today.modal_price).toLocaleString("en-IN")}/Quintal\n` +
          "You'll get daily alerts at 7AM.";

        twiml.message(reply);
        await logWhatsAppExchange(phone, messageBody, reply);
        return res.type("text/xml").send(twiml.toString());
      }

      await clearSession(phone);

      const predicted = await getPrediction(today.crop_name, today.mandi_name);
      const reply =
        `Confirmed: ${today.crop_name} in ${townName}, ${cityName}, ${districtName}.\n` +
        `${today.crop_name} at ${today.mandi_name} (${today.district})\n` +
        `Today: Rs ${Number(today.modal_price).toLocaleString("en-IN")}/Quintal\n` +
        `Range: Rs ${Number(today.min_price).toLocaleString("en-IN")} - Rs ${Number(
          today.max_price
        ).toLocaleString("en-IN")}\n` +
        `Next week estimate: Rs ${Number(
          predicted || today.modal_price
        ).toLocaleString("en-IN")}/Quintal`;

      twiml.message(reply);
      await logWhatsAppExchange(phone, messageBody, reply);
      return res.type("text/xml").send(twiml.toString());
    }

    if (!upperMessage.startsWith("SUBSCRIBE")) {
      const tokens = messageBody.split(" ");
      const cropName = tokens[0];

      if (!cropName) {
        const reply = "Send a crop name to get today's price.";
        twiml.message(reply);
        await logWhatsAppExchange(phone, messageBody, reply);
        return res.type("text/xml").send(twiml.toString());
      }

      await saveSession(phone, {
        step: "awaiting_district",
        intent: "price",
        cropName
      });

      const reply =
        `Got it — ${cropName}.\n` +
        "Which district are you in?\n" +
        "Example: Coimbatore, Erode, Tiruppur";
      twiml.message(reply);
      await logWhatsAppExchange(phone, messageBody, reply);
      return res.type("text/xml").send(twiml.toString());
    }

    const helpReply = "Send HI to see available commands.";
    twiml.message(helpReply);
    await logWhatsAppExchange(phone, messageBody, helpReply);
    return res.type("text/xml").send(twiml.toString());
  } catch (error) {
    logWarn(`WhatsApp webhook failed: ${error.message}`);
    const reply = "Something went wrong. Please try again later.";
    twiml.message(reply);
    return res.type("text/xml").send(twiml.toString());
  }
};

const getWhatsappLogs = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT phone, incoming_message, outgoing_message, created_at FROM whatsapp_logs ORDER BY created_at DESC LIMIT 200"
    );

    return res.json({
      success: true,
      data: rows,
      message: "WhatsApp logs fetched"
    });
  } catch (error) {
    logWarn(`Fetch WhatsApp logs failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      data: null,
      message: "Failed to fetch WhatsApp logs"
    });
  }
};

const testSendWhatsApp = async (req, res) => {
  try {
    const secret = process.env.WHATSAPP_TEST_SECRET;
    if (secret) {
      const provided =
        req.headers["x-whatsapp-test-secret"] || req.query.secret;
      if (provided !== secret) {
        return res.status(401).json({
          success: false,
          data: null,
          message: "Unauthorized"
        });
      }
    }

    const { to, message } = req.body || {};
    if (!to) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Recipient phone number is required"
      });
    }

    const body = message || "KisanRate WhatsApp test message.";
    const result = await sendWhatsAppMessage(to, body);
    if (!result) {
      return res.status(500).json({
        success: false,
        data: null,
        message: "WhatsApp send failed"
      });
    }

    return res.json({
      success: true,
      data: { sid: result.sid },
      message: "WhatsApp message sent"
    });
  } catch (error) {
    logWarn(`WhatsApp test send failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      data: null,
      message: "WhatsApp test send failed"
    });
  }
};

module.exports = { whatsappWebhook, getWhatsappLogs, testSendWhatsApp };
