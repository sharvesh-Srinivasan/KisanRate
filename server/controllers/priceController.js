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
      `SELECT DATE_FORMAT(MAX(p.price_date), '%Y-%m-%d') AS latest_date
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
    const currentYear = new Date().getFullYear();

    const [mspRows] = await db.query("SELECT crop_id, msp_price FROM msp_rates WHERE effective_year = ?", [currentYear]);
    const mspMap = {};
    mspRows.forEach(r => { mspMap[r.crop_id] = r.msp_price; });

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
        msp_price: mspMap[row.crop_id] ? Number(mspMap[row.crop_id]) : null,
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
      `SELECT DATE_FORMAT(MAX(p.price_date), '%Y-%m-%d') AS latest_date
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

    if (!rows.length) {
      return res.json({
        success: true,
        data: { updated: 0, total: 0, state, price_date: latestDate || null },
        message: "No price rows to predict"
      });
    }

    let updated = 0;
    let failed = 0;
    const total = rows.length;
    const BATCH_SIZE = 5;
    const OVERALL_TIMEOUT_MS = 180000; // 3 minutes max
    const startTime = Date.now();
    let timedOut = false;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      // Check overall timeout before starting next batch
      if (Date.now() - startTime > OVERALL_TIMEOUT_MS) {
        timedOut = true;
        logWarn(`predictTodayForState timed out after ${Math.round((Date.now() - startTime) / 1000)}s. Processed ${i}/${total} rows (${updated} updated).`);
        break;
      }

      const batch = rows.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (row) => {
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
            return true;
          }
          return false;
        })
      );

      for (const r of results) {
        if (r.status === "fulfilled" && r.value) {
          updated++;
        } else if (r.status === "rejected") {
          failed++;
        }
      }
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const message = timedOut
      ? `Partial: ${updated}/${total} predictions updated in ${elapsed}s (timed out)`
      : `${updated}/${total} predictions updated in ${elapsed}s`;

    return res.json({
      success: true,
      data: { updated, failed, total, state, price_date: latestDate || null, timed_out: timedOut },
      message
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
    const batchSize = 3;
    for (let i = 0; i < rows.length; i += batchSize) {
      const chunk = rows.slice(i, i + batchSize);
      await Promise.all(
        chunk.map(async (row) => {
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
        })
      );
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

const getAnalytics = async (req, res) => {
  try {
    const [topCrops] = await db.query(
      `SELECT c.name AS crop_name, COUNT(*) AS record_count
       FROM prices p
       JOIN crops c ON p.crop_id = c.id
       GROUP BY c.id, c.name
       ORDER BY record_count DESC
       LIMIT 5`
    );

    const [busiestMandis] = await db.query(
      `SELECT m.name AS mandi_name, m.district, COUNT(*) AS record_count
       FROM prices p
       JOIN mandis m ON p.mandi_id = m.id
       GROUP BY m.id, m.name, m.district
       ORDER BY record_count DESC
       LIMIT 5`
    );

    const [priceTrend] = await db.query(
      `SELECT price_date, ROUND(AVG(modal_price), 2) AS avg_price
       FROM prices
       WHERE price_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY price_date
       ORDER BY price_date ASC`
    );

    const [predictionAccuracy] = await db.query(
      `SELECT price_date,
              ROUND(AVG(modal_price), 2) AS actual,
              ROUND(AVG(predicted_price), 2) AS predicted
       FROM prices
       WHERE predicted_price IS NOT NULL
         AND predicted_price > 0
         AND price_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY price_date
       ORDER BY price_date ASC`
    );

    const [summary] = await db.query(
      `SELECT
         COUNT(DISTINCT crop_id) AS total_crops,
         COUNT(DISTINCT mandi_id) AS total_mandis,
         COUNT(*) AS total_records,
         SUM(CASE WHEN predicted_price IS NOT NULL AND predicted_price > 0 THEN 1 ELSE 0 END) AS predicted_count
       FROM prices`
    );

    return res.json({
      success: true,
      data: {
        topCrops,
        busiestMandis,
        priceTrend,
        predictionAccuracy,
        summary: summary[0]
      },
      message: "Analytics fetched"
    });
  } catch (error) {
    logWarn(`Analytics failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      data: null,
      message: "Failed to fetch analytics"
    });
  }
};

const clearStalePredictions = async (req, res) => {
  try {
    // Clear any rows where predictions are 0 — these were written before the fix
    const [result] = await db.query(
      `UPDATE prices
       SET predicted_price = NULL,
           predicted_lower = NULL,
           predicted_upper = NULL,
           predicted_at = NULL
       WHERE predicted_price = 0
          OR predicted_lower = 0
          OR predicted_upper = 0`
    );

    return res.json({
      success: true,
      data: { cleared: result.affectedRows },
      message: `Cleared ${result.affectedRows} stale zero-prediction rows`
    });
  } catch (error) {
    logWarn(`Clear stale predictions failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      data: null,
      message: "Failed to clear stale predictions"
    });
  }
};

const reportPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { reported_price, reason } = req.body || {};

    if (!id) {
      return res.status(400).json({ success: false, data: null, message: "Price ID required" });
    }

    await db.query(
      `CREATE TABLE IF NOT EXISTS price_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        price_id INT NOT NULL,
        reported_price DECIMAL(10,2),
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );

    await db.query(
      "INSERT INTO price_reports (price_id, reported_price, reason) VALUES (?, ?, ?)",
      [id, reported_price || null, reason || null]
    );

    return res.json({ success: true, data: null, message: "Report submitted" });
  } catch (error) {
    logWarn(`Report price failed: ${error.message}`);
    return res.status(500).json({ success: false, data: null, message: "Failed to submit report" });
  }
};

const getPriceReports = async (req, res) => {
  try {
    // Ensure table exists before querying
    await db.query(
      `CREATE TABLE IF NOT EXISTS price_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        price_id INT NOT NULL,
        reported_price DECIMAL(10,2),
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );

    const [rows] = await db.query(
      `SELECT pr.id, pr.price_id, pr.reported_price, pr.reason, pr.created_at,
              c.name AS crop_name, m.name AS mandi_name, p.modal_price AS current_price, p.price_date
       FROM price_reports pr
       JOIN prices p ON pr.price_id = p.id
       JOIN crops c ON p.crop_id = c.id
       JOIN mandis m ON p.mandi_id = m.id
       ORDER BY pr.created_at DESC
       LIMIT 200`
    );

    return res.json({ success: true, data: rows, message: "Reports fetched" });
  } catch (error) {
    logWarn(`Get price reports failed: ${error.message}`);
    return res.status(500).json({ success: false, data: null, message: "Failed to fetch reports" });
  }
};

// ── Crops that actually have price data ────────────────────────────────────────

const getCropsWithPrices = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT DISTINCT c.id, c.name, c.name_telugu, c.unit
       FROM crops c
       INNER JOIN prices p ON c.id = p.crop_id
       ORDER BY c.name ASC`
    );

    return res.json({
      success: true,
      data: rows,
      message: "Crops with price data fetched"
    });
  } catch (error) {
    logWarn(`getCropsWithPrices failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      data: null,
      message: "Failed to fetch crops"
    });
  }
};

// ── Mandis that have price data for a specific crop ────────────────────────────

const getMandisForCrop = async (req, res) => {
  try {
    const { crop_id } = req.query;

    if (!crop_id) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "crop_id is required"
      });
    }

    const [rows] = await db.query(
      `SELECT DISTINCT m.id, m.name, m.district, m.state
       FROM mandis m
       INNER JOIN prices p ON m.id = p.mandi_id
       WHERE p.crop_id = ?
       ORDER BY m.name ASC`,
      [crop_id]
    );

    return res.json({
      success: true,
      data: rows,
      message: "Mandis for crop fetched"
    });
  } catch (error) {
    logWarn(`getMandisForCrop failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      data: null,
      message: "Failed to fetch mandis"
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
  predictTodayForState,
  clearStalePredictions,
  getAnalytics,
  reportPrice,
  getPriceReports,
  getCropsWithPrices,
  getMandisForCrop
};
