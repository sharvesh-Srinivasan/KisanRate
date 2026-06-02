const cron = require("node-cron");
const db = require("../config/db");
const { fetchAgmarknetPrices } = require("../services/agmarknetService");
const { emitPricesUpdated } = require("../socket/socketHandler");

const timestamp = () => new Date().toISOString();
const logWarn = (message) => {
  process.stderr.write(`[WARN] ${timestamp()} ${message}\n`);
};

const normalizeDate = (rawDate) => {
  if (!rawDate) return null;
  const trimmed = String(rawDate).trim();

  if (trimmed.includes("-")) {
    const parts = trimmed.split("-");
    if (parts[0].length === 4) {
      return trimmed;
    }
  }

  if (trimmed.includes("/")) {
    const [day, month, year] = trimmed.split("/");
    if (year && month && day) {
      return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }

  const fallback = new Date(trimmed);
  if (Number.isNaN(fallback.getTime())) return null;
  return fallback.toISOString().slice(0, 10);
};

const upsertCrop = async (name) => {
  const [rows] = await db.query(
    "SELECT id FROM crops WHERE LOWER(name) = LOWER(?) LIMIT 1",
    [name]
  );
  if (rows.length) return rows[0].id;

  const [result] = await db.query("INSERT INTO crops (name) VALUES (?)", [
    name
  ]);
  return result.insertId;
};

const upsertMandi = async (name, district, state) => {
  const [rows] = await db.query(
    "SELECT id FROM mandis WHERE LOWER(name) = LOWER(?) AND LOWER(district) = LOWER(?) LIMIT 1",
    [name, district]
  );
  if (rows.length) return rows[0].id;

  const [result] = await db.query(
    "INSERT INTO mandis (name, district, state) VALUES (?, ?, ?)",
    [name, district, state]
  );
  return result.insertId;
};

const fetchPricesNow = async () => {
  try {
    const records = await fetchAgmarknetPrices();
    for (const record of records) {
      if (!record.crop || !record.mandi || !record.district) {
        continue;
      }

      const cropId = await upsertCrop(record.crop);
      const mandiId = await upsertMandi(
        record.mandi,
        record.district,
        record.state || "Telangana"
      );
      const priceDate = normalizeDate(record.date) || new Date().toISOString().slice(0, 10);

      await db.query(
        `INSERT INTO prices (crop_id, mandi_id, min_price, max_price, modal_price, price_date)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           min_price = VALUES(min_price),
           max_price = VALUES(max_price),
           modal_price = VALUES(modal_price)`,
        [
          cropId,
          mandiId,
          record.min_price,
          record.max_price,
          record.modal_price,
          priceDate
        ]
      );
    }

    emitPricesUpdated();
  } catch (error) {
    logWarn(`Fetch prices job failed: ${error.message}`);
  }
};

const startFetchPricesJob = () => {
  cron.schedule("0 6 * * *", fetchPricesNow);
};

module.exports = { startFetchPricesJob, fetchPricesNow };
