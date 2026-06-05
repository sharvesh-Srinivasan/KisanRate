const db = require("../config/db");

const timestamp = () => new Date().toISOString();
const logWarn = (msg) => process.stderr.write(`[WARN] ${timestamp()} ${msg}\n`);

// ── List Stock ─────────────────────────────────────────────────────────────────

const listStock = async (req, res) => {
  try {
    const { farmerId } = req.farmer;

    const [rows] = await db.query(
      `SELECT fs.id, fs.crop_id, fs.quantity_quintals, fs.harvest_date,
              fs.storage_location, fs.created_at,
              c.name AS crop_name, c.unit
       FROM farmer_stock fs
       JOIN crops c ON fs.crop_id = c.id
       WHERE fs.farmer_id = ?
       ORDER BY fs.created_at DESC`,
      [farmerId]
    );

    return res.json({ success: true, data: rows, message: "Stock fetched" });
  } catch (error) {
    logWarn(`listStock failed: ${error.message}`);
    return res.status(500).json({ success: false, data: null, message: "Failed to fetch stock" });
  }
};

// ── Add Stock ──────────────────────────────────────────────────────────────────

const addStock = async (req, res) => {
  try {
    const { farmerId } = req.farmer;
    const { crop_id, quantity_quintals, harvest_date, storage_location } = req.body || {};

    if (!crop_id || !quantity_quintals || Number(quantity_quintals) <= 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Crop and quantity are required"
      });
    }

    const [result] = await db.query(
      `INSERT INTO farmer_stock (farmer_id, crop_id, quantity_quintals, harvest_date, storage_location)
       VALUES (?, ?, ?, ?, ?)`,
      [
        farmerId,
        crop_id,
        Number(quantity_quintals),
        harvest_date || null,
        storage_location || null
      ]
    );

    return res.status(201).json({
      success: true,
      data: { id: result.insertId },
      message: "Stock added"
    });
  } catch (error) {
    logWarn(`addStock failed: ${error.message}`);
    return res.status(500).json({ success: false, data: null, message: "Failed to add stock" });
  }
};

// ── Update Stock ───────────────────────────────────────────────────────────────

const updateStock = async (req, res) => {
  try {
    const { farmerId } = req.farmer;
    const { id } = req.params;
    const { quantity_quintals, harvest_date, storage_location } = req.body || {};

    const [existing] = await db.query(
      "SELECT id FROM farmer_stock WHERE id = ? AND farmer_id = ?",
      [id, farmerId]
    );

    if (!existing.length) {
      return res.status(404).json({ success: false, data: null, message: "Stock entry not found" });
    }

    await db.query(
      `UPDATE farmer_stock SET
         quantity_quintals = COALESCE(?, quantity_quintals),
         harvest_date = COALESCE(?, harvest_date),
         storage_location = COALESCE(?, storage_location)
       WHERE id = ? AND farmer_id = ?`,
      [
        quantity_quintals != null ? Number(quantity_quintals) : null,
        harvest_date || null,
        storage_location || null,
        id,
        farmerId
      ]
    );

    return res.json({ success: true, data: null, message: "Stock updated" });
  } catch (error) {
    logWarn(`updateStock failed: ${error.message}`);
    return res.status(500).json({ success: false, data: null, message: "Failed to update stock" });
  }
};

// ── Delete Stock ───────────────────────────────────────────────────────────────

const deleteStock = async (req, res) => {
  try {
    const { farmerId } = req.farmer;
    const { id } = req.params;

    await db.query(
      "DELETE FROM farmer_stock WHERE id = ? AND farmer_id = ?",
      [id, farmerId]
    );

    return res.json({ success: true, data: null, message: "Stock removed" });
  } catch (error) {
    logWarn(`deleteStock failed: ${error.message}`);
    return res.status(500).json({ success: false, data: null, message: "Failed to remove stock" });
  }
};

// ── Portfolio ──────────────────────────────────────────────────────────────────
// Enriches each stock entry with:
//  - current modal price (best mandi for that crop)
//  - price at harvest (approximate — closest price entry to harvest_date)
//  - price change % since harvest
//  - total value (qty × current modal price)
//  - best mandi to sell at (highest modal price today)
//  - predicted price from ML column

const getPortfolio = async (req, res) => {
  try {
    const { farmerId } = req.farmer;

    // 1. Get farmer's stock
    const [stock] = await db.query(
      `SELECT fs.id, fs.crop_id, fs.quantity_quintals, fs.harvest_date, fs.storage_location,
              c.name AS crop_name, c.unit
       FROM farmer_stock fs
       JOIN crops c ON fs.crop_id = c.id
       WHERE fs.farmer_id = ?`,
      [farmerId]
    );

    if (!stock.length) {
      return res.json({ success: true, data: [], message: "No stock found" });
    }

    const cropIds = [...new Set(stock.map((s) => s.crop_id))];

    // 2. Latest prices for all relevant crops (all mandis) — to find best mandi
    const [latestPrices] = await db.query(
      `SELECT p.crop_id, p.mandi_id, m.name AS mandi_name, m.district,
              p.modal_price, p.predicted_price, p.price_date
       FROM prices p
       JOIN mandis m ON p.mandi_id = m.id
       WHERE p.crop_id IN (?)
         AND p.price_date = (
           SELECT MAX(p2.price_date) FROM prices p2 WHERE p2.crop_id = p.crop_id
         )
       ORDER BY p.crop_id, p.modal_price DESC`,
      [cropIds]
    );

    // Group by crop_id
    const pricesByCrop = {};
    for (const row of latestPrices) {
      if (!pricesByCrop[row.crop_id]) {
        pricesByCrop[row.crop_id] = [];
      }
      pricesByCrop[row.crop_id].push(row);
    }

    // 3. For each stock item, enrich with price data
    const portfolio = await Promise.all(
      stock.map(async (item) => {
        const cropPrices = pricesByCrop[item.crop_id] || [];
        const bestMandi = cropPrices[0] || null; // highest modal price
        const currentPrice = bestMandi ? Number(bestMandi.modal_price) : null;
        const predictedPrice = bestMandi ? Number(bestMandi.predicted_price) : null;
        const totalValue = currentPrice ? currentPrice * Number(item.quantity_quintals) : null;

        // Price at harvest — find closest price entry on or before harvest_date
        let harvestPrice = null;
        let priceChangePct = null;

        if (item.harvest_date && bestMandi) {
          const [harvestRows] = await db.query(
            `SELECT modal_price FROM prices
             WHERE crop_id = ? AND mandi_id = ? AND price_date <= ?
             ORDER BY price_date DESC LIMIT 1`,
            [item.crop_id, bestMandi.mandi_id, item.harvest_date]
          );

          if (harvestRows.length && Number(harvestRows[0].modal_price) > 0) {
            harvestPrice = Number(harvestRows[0].modal_price);
            priceChangePct = (((currentPrice - harvestPrice) / harvestPrice) * 100).toFixed(1);
          }
        }

        return {
          ...item,
          current_price: currentPrice,
          predicted_price: predictedPrice,
          harvest_price: harvestPrice,
          price_change_pct: priceChangePct ? Number(priceChangePct) : null,
          total_value: totalValue ? Math.round(totalValue) : null,
          best_mandi: bestMandi
            ? {
                mandi_id: bestMandi.mandi_id,
                mandi_name: bestMandi.mandi_name,
                district: bestMandi.district,
                modal_price: Number(bestMandi.modal_price)
              }
            : null,
          all_mandis: cropPrices.slice(0, 5).map((p) => ({
            mandi_id: p.mandi_id,
            mandi_name: p.mandi_name,
            district: p.district,
            modal_price: Number(p.modal_price)
          }))
        };
      })
    );

    return res.json({ success: true, data: portfolio, message: "Portfolio fetched" });
  } catch (error) {
    logWarn(`getPortfolio failed: ${error.message}`);
    return res.status(500).json({ success: false, data: null, message: "Failed to fetch portfolio" });
  }
};

// ── Sell Advice ────────────────────────────────────────────────────────────────
// Returns current price, 7-day price history, ML prediction, and a recommendation.

const getSellAdvice = async (req, res) => {
  try {
    const { crop_id, mandi_id, quantity, target_price } = req.query;

    if (!crop_id) {
      return res.status(400).json({ success: false, data: null, message: "crop_id is required" });
    }

    // Get latest price for this crop (best mandi if mandi_id not specified)
    let priceQuery;
    let priceParams;

    if (mandi_id) {
      [priceQuery] = await db.query(
        `SELECT p.modal_price, p.predicted_price, p.predicted_lower, p.predicted_upper,
                p.price_date, m.name AS mandi_name
         FROM prices p
         JOIN mandis m ON p.mandi_id = m.id
         WHERE p.crop_id = ? AND p.mandi_id = ?
         ORDER BY p.price_date DESC LIMIT 1`,
        [crop_id, mandi_id]
      );
    } else {
      // Best mandi (highest modal price today)
      [priceQuery] = await db.query(
        `SELECT p.modal_price, p.predicted_price, p.predicted_lower, p.predicted_upper,
                p.price_date, m.name AS mandi_name, m.id AS mandi_id
         FROM prices p
         JOIN mandis m ON p.mandi_id = m.id
         WHERE p.crop_id = ?
           AND p.price_date = (SELECT MAX(p2.price_date) FROM prices p2 WHERE p2.crop_id = ?)
         ORDER BY p.modal_price DESC LIMIT 1`,
        [crop_id, crop_id]
      );
      priceParams = [];
    }

    const priceRow = priceQuery[0] || null;
    if (!priceRow) {
      return res.json({
        success: true,
        data: { no_data: true },
        message: "No price data available for this crop"
      });
    }

    // 30-day history for trend analysis
    const [history] = await db.query(
      `SELECT price_date, modal_price FROM (
         SELECT price_date, modal_price
         FROM prices
         WHERE crop_id = ? AND mandi_id = ?
         ORDER BY price_date DESC LIMIT 30
       ) t ORDER BY price_date ASC`,
      [crop_id, mandi_id || priceRow.mandi_id]
    );

    const currentPrice = Number(priceRow.modal_price);
    const predictedPrice = priceRow.predicted_price ? Number(priceRow.predicted_price) : null;
    const targetPriceNum = target_price ? Number(target_price) : null;
    const qty = quantity ? Number(quantity) : null;

    // Build recommendation
    let signal = "neutral";
    let recommendation = "";
    let peakDay = null;
    let waitDays = null;

    // 7-day avg
    const recent = history.slice(-7).map((h) => Number(h.modal_price)).filter((p) => p > 0);
    const avg7 = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : currentPrice;

    const aboveAvg = currentPrice > avg7 * 1.03;
    const predRise = predictedPrice && predictedPrice > currentPrice * 1.04;
    const predFall = predictedPrice && predictedPrice < currentPrice * 0.97;

    if (predRise) {
      signal = "hold";
      const pctRise = (((predictedPrice - currentPrice) / currentPrice) * 100).toFixed(1);
      waitDays = 3;
      recommendation = `Price is predicted to rise by ${pctRise}% (to ₹${predictedPrice.toLocaleString("en-IN")}). Recommended: Wait ${waitDays} days before selling.`;
    } else if (aboveAvg && !predRise) {
      signal = "sell";
      recommendation = `Price is ${(((currentPrice - avg7) / avg7) * 100).toFixed(1)}% above 7-day average. Good time to sell now.`;
    } else if (predFall) {
      signal = "sell_urgent";
      recommendation = `Price is predicted to fall. Sell as soon as possible to lock in current rate of ₹${currentPrice.toLocaleString("en-IN")}.`;
    } else {
      signal = "sell";
      recommendation = `Price is stable. You can sell at the current rate of ₹${currentPrice.toLocaleString("en-IN")}.`;
    }

    // If target price is set — check if it can realistically be reached
    if (targetPriceNum && targetPriceNum > currentPrice) {
      if (predictedPrice && predictedPrice >= targetPriceNum) {
        signal = "hold";
        recommendation = `Target price ₹${targetPriceNum.toLocaleString("en-IN")} looks achievable — prediction of ₹${predictedPrice.toLocaleString("en-IN")} exceeds it. Consider waiting.`;
      } else {
        recommendation += ` Note: Your target of ₹${targetPriceNum.toLocaleString("en-IN")} may not be reached soon based on current predictions.`;
      }
    }

    const totalValueNow = qty ? Math.round(currentPrice * qty) : null;
    const totalValuePredicted = qty && predictedPrice ? Math.round(predictedPrice * qty) : null;

    return res.json({
      success: true,
      data: {
        signal,
        recommendation,
        current_price: currentPrice,
        predicted_price: predictedPrice,
        predicted_lower: priceRow.predicted_lower ? Number(priceRow.predicted_lower) : null,
        predicted_upper: priceRow.predicted_upper ? Number(priceRow.predicted_upper) : null,
        avg_7day: Math.round(avg7),
        mandi_name: priceRow.mandi_name,
        price_date: priceRow.price_date,
        wait_days: waitDays,
        total_value_now: totalValueNow,
        total_value_predicted: totalValuePredicted,
        history: history.map((h) => ({
          date: h.price_date,
          price: Number(h.modal_price)
        }))
      },
      message: "Sell advice generated"
    });
  } catch (error) {
    logWarn(`getSellAdvice failed: ${error.message}`);
    return res.status(500).json({ success: false, data: null, message: "Failed to generate advice" });
  }
};

module.exports = { listStock, addStock, updateStock, deleteStock, getPortfolio, getSellAdvice };
