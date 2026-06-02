const db = require("../config/db");
const { getPrediction } = require("../services/mlService");
const { fetchPricesNow } = require("../jobs/fetchPrices");

const timestamp = () => new Date().toISOString();
const logWarn = (message) => {
  process.stderr.write(`[WARN] ${timestamp()} ${message}\n`);
};

const getPrices = async (req, res) => {
  try {
    const { crop, district, state } = req.query;
    const filters = [];
    let whereClause = "";

    if (crop) {
      filters.push(`%${crop}%`);
    }
    if (district) {
      filters.push(`%${district}%`);
    }
    if (state) {
      filters.push(`%${state}%`);
    }

    const whereParts = [];
    if (crop) {
      whereParts.push("c.name LIKE ?");
    }
    if (district) {
      whereParts.push("m.district LIKE ?");
    }
    if (state) {
      whereParts.push("m.state LIKE ?");
    }

    const whereFilter = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

    const [latestRows] = await db.query(
      `SELECT MAX(p.price_date) AS latest_date
       FROM prices p
       JOIN crops c ON p.crop_id = c.id
       JOIN mandis m ON p.mandi_id = m.id
       ${whereFilter}`,
      filters
    );

    const latestDate = latestRows[0]?.latest_date;
    if (latestDate) {
      whereClause = `${whereFilter} ${whereFilter ? "AND" : "WHERE"} p.price_date = ?`;
      filters.push(latestDate);
    } else {
      whereClause = `${whereFilter} ${whereFilter ? "AND" : "WHERE"} p.price_date = CURDATE()`;
    }

    const [rows] = await db.query(
      `SELECT p.id, p.crop_id, p.mandi_id, p.modal_price, p.min_price, p.max_price,
        p.price_date, p.predicted_price, p.predicted_lower, p.predicted_upper, p.predicted_at,
        c.name AS crop_name, m.name AS mandi_name,
        m.district, m.state
       FROM prices p
       JOIN crops c ON p.crop_id = c.id
       JOIN mandis m ON p.mandi_id = m.id
       ${whereClause}
       ORDER BY p.modal_price DESC`,
      filters
    );

    const today = new Date().toISOString().slice(0, 10);

    const enriched = rows.map((row) => {
      const predictedAt = row.predicted_at
        ? new Date(row.predicted_at).toISOString().slice(0, 10)
        : null;
      const hasFreshPrediction =
        row.predicted_price != null && predictedAt === today;

      return {
        ...row,
        predicted_price:
          row.predicted_price != null ? Number(row.predicted_price) : null,
        predicted_lower:
          row.predicted_lower != null ? Number(row.predicted_lower) : null,
        predicted_upper:
          row.predicted_upper != null ? Number(row.predicted_upper) : null,
        prediction_fresh: hasFreshPrediction
      };
    });

    return res.json({
      success: true,
      data: enriched,
      message: "Prices fetched"
    });
  } catch (error) {
    logWarn(`Fetch prices failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      data: null,
      message: "Failed to fetch prices"
    });
  }
};

const getPriceHistory = async (req, res) => {
  try {
    const { cropId, mandiId } = req.params;
    const [rows] = await db.query(
      `SELECT price_date, modal_price
       FROM (
         SELECT price_date, modal_price
         FROM prices
         WHERE crop_id = ? AND mandi_id = ?
         ORDER BY price_date DESC
         LIMIT 30
       ) AS recent
       ORDER BY price_date ASC`,
      [cropId, mandiId]
    );

    return res.json({
      success: true,
      data: rows,
      message: "Price history fetched"
    });
  } catch (error) {
    logWarn(`Fetch history failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      data: null,
      message: "Failed to fetch price history"
    });
  }
};

const getCrops = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, name, name_telugu, unit FROM crops ORDER BY name ASC"
    );

    return res.json({
      success: true,
      data: rows,
      message: "Crops fetched"
    });
  } catch (error) {
    logWarn(`Fetch crops failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      data: null,
      message: "Failed to fetch crops"
    });
  }
};

const getMandis = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, name, district, state FROM mandis ORDER BY name ASC"
    );

    return res.json({
      success: true,
      data: rows,
      message: "Mandis fetched"
    });
  } catch (error) {
    logWarn(`Fetch mandis failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      data: null,
      message: "Failed to fetch mandis"
    });
  }
};

const manualPriceAdd = async (req, res) => {
  try {
    const {
      crop_id,
      mandi_id,
      min_price,
      max_price,
      modal_price,
      price_date,
      trigger_fetch
    } = req.body || {};

    if (trigger_fetch) {
      await fetchPricesNow();
      return res.json({
        success: true,
        data: null,
        message: "Price fetch triggered"
      });
    }

    if (!crop_id || !mandi_id || !modal_price || !price_date) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Missing required fields"
      });
    }

    await db.query(
      `INSERT INTO prices (crop_id, mandi_id, min_price, max_price, modal_price, price_date)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         min_price = VALUES(min_price),
         max_price = VALUES(max_price),
         modal_price = VALUES(modal_price)`,
      [crop_id, mandi_id, min_price, max_price, modal_price, price_date]
    );

    return res.json({
      success: true,
      data: null,
      message: "Price saved"
    });
  } catch (error) {
    logWarn(`Manual price add failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      data: null,
      message: "Failed to save price"
    });
  }
};

const predictTodayForState = async (req, res) => {
  try {
    const { state } = req.body || {};
    if (!state) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "State is required"
      });
    }

    const filters = [`%${state}%`];

    const [latestRows] = await db.query(
      `SELECT MAX(p.price_date) AS latest_date
       FROM prices p
       JOIN crops c ON p.crop_id = c.id
       JOIN mandis m ON p.mandi_id = m.id
       WHERE m.state LIKE ?`,
      filters
    );

    const latestDate = latestRows[0]?.latest_date;
    const whereClause = latestDate
      ? "WHERE m.state LIKE ? AND p.price_date = ?"
      : "WHERE m.state LIKE ? AND p.price_date = CURDATE()";

    if (latestDate) {
      filters.push(latestDate);
    }

    const [rows] = await db.query(
      `SELECT p.id, c.name AS crop_name, m.name AS mandi_name
       FROM prices p
       JOIN crops c ON p.crop_id = c.id
       JOIN mandis m ON p.mandi_id = m.id
       ${whereClause}`,
      filters
    );

    let updated = 0;
    for (const row of rows) {
      const predicted = await getPrediction(row.crop_name, row.mandi_name);
      if (predicted && typeof predicted.predicted_price === "number") {
        await db.query(
          "UPDATE prices SET predicted_price = ?, predicted_lower = ?, predicted_upper = ?, predicted_at = NOW() WHERE id = ?",
          [
            predicted.predicted_price,
            predicted.predicted_lower ?? predicted.predicted_price,
            predicted.predicted_upper ?? predicted.predicted_price,
            row.id
          ]
        );
        updated += 1;
      }
    }

    return res.json({
      success: true,
      data: { updated, state, price_date: latestDate || null },
      message: "Predictions updated"
    });
  } catch (error) {
    logWarn(`Predict today failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      data: null,
      message: "Failed to run predictions"
    });
  }
};

const refreshPredictions = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.id, c.name AS crop_name, m.name AS mandi_name
       FROM prices p
       JOIN crops c ON p.crop_id = c.id
       JOIN mandis m ON p.mandi_id = m.id
       WHERE p.price_date = CURDATE()`
    );

    let updated = 0;
    for (const row of rows) {
      const predicted = await getPrediction(row.crop_name, row.mandi_name);
      if (predicted && typeof predicted.predicted_price === "number") {
        await db.query(
          "UPDATE prices SET predicted_price = ?, predicted_lower = ?, predicted_upper = ?, predicted_at = NOW() WHERE id = ?",
          [
            predicted.predicted_price,
            predicted.predicted_lower ?? predicted.predicted_price,
            predicted.predicted_upper ?? predicted.predicted_price,
            row.id
          ]
        );
        updated += 1;
      }
    }

    return res.json({
      success: true,
      data: { updated },
      message: "Predictions refreshed"
    });
  } catch (error) {
    logWarn(`Refresh predictions failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      data: null,
      message: "Failed to refresh predictions"
    });
  }
};

module.exports = {
  getPrices,
  getPriceHistory,
  getCrops,
  getMandis,
  manualPriceAdd,
  refreshPredictions,
  predictTodayForState
};
