const { MessagingResponse } = require("twilio").twiml;
const db = require("../config/db");
const { getPrediction } = require("../services/mlService");

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
        "Send: {crop} {district} - get today's price\n" +
        "Send: SUBSCRIBE {crop} {district} - get daily alerts\n" +
        "Send: STOP - unsubscribe from alerts";
      twiml.message(reply);
      await logWhatsAppExchange(phone, messageBody, reply);
      return res.type("text/xml").send(twiml.toString());
    }

    if (upperMessage.startsWith("SUBSCRIBE ")) {
      const [_, cropName, ...districtParts] = messageBody.split(" ");
      const districtName = districtParts.join(" ");

      if (!cropName || !districtName) {
        const reply = "Please send: SUBSCRIBE {crop} {district}";
        twiml.message(reply);
        await logWhatsAppExchange(phone, messageBody, reply);
        return res.type("text/xml").send(twiml.toString());
      }

      const { crop, mandi } = await findCropAndMandi(cropName, districtName);
      if (!crop || !mandi) {
        const reply = "Could not find that crop or district. Please try again.";
        twiml.message(reply);
        await logWhatsAppExchange(phone, messageBody, reply);
        return res.type("text/xml").send(twiml.toString());
      }

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

      const today = await fetchTodayPrice(crop.name, mandi.name);
      const modal = today?.modal_price ?? 0;

      const reply =
        `Subscribed! Today's ${crop.name} at ${mandi.name}: ` +
        `Rs ${Number(modal).toLocaleString("en-IN")}/Quintal\n` +
        "You'll get daily alerts at 7AM.";

      twiml.message(reply);
      await logWhatsAppExchange(phone, messageBody, reply);
      return res.type("text/xml").send(twiml.toString());
    }

    if (upperMessage === "STOP") {
      await db.query("UPDATE farmers SET subscribed = FALSE WHERE phone = ?", [
        phone
      ]);

      const reply = "You've been unsubscribed. Send HI to restart.";
      twiml.message(reply);
      await logWhatsAppExchange(phone, messageBody, reply);
      return res.type("text/xml").send(twiml.toString());
    }

    if (!upperMessage.startsWith("SUBSCRIBE")) {
      const [cropName, ...districtParts] = messageBody.split(" ");
      const districtName = districtParts.join(" ");

      if (!cropName || !districtName) {
        const reply = "Send: {crop} {district} to get today's price.";
        twiml.message(reply);
        await logWhatsAppExchange(phone, messageBody, reply);
        return res.type("text/xml").send(twiml.toString());
      }

      const today = await fetchTodayPrice(cropName, districtName);
      if (!today) {
        const reply = "No price found for that crop and district today.";
        twiml.message(reply);
        await logWhatsAppExchange(phone, messageBody, reply);
        return res.type("text/xml").send(twiml.toString());
      }

      const predicted = await getPrediction(today.crop_name, today.mandi_name);
      const reply =
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

module.exports = { whatsappWebhook, getWhatsappLogs };
