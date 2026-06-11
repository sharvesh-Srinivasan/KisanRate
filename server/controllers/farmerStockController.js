const db = require("../config/db");
const { checkRainForecast } = require("../services/weatherService");
const { getPrediction } = require("../services/mlService");

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

    const currentYear = new Date().getFullYear();
    const [mspRows] = await db.query("SELECT crop_id, msp_price FROM msp_rates WHERE effective_year = ?", [currentYear]);
    const mspMap = {};
    mspRows.forEach(r => { mspMap[r.crop_id] = r.msp_price; });

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

        // Wait vs Sell logic
        let waitVsSellProfitDiff = null;
        let optimalAction = "Sell Today";
        if (currentPrice && predictedPrice) {
          const diff = (predictedPrice - currentPrice) * Number(item.quantity_quintals);
          waitVsSellProfitDiff = Math.round(diff);
          if (predictedPrice > currentPrice * 1.04) {
            optimalAction = "Wait 3 Days";
          } else if (predictedPrice < currentPrice * 0.97) {
            optimalAction = "Sell Urgent";
          } else {
            optimalAction = "Sell Today";
          }
        }

        const mspPrice = mspMap[item.crop_id] ? Number(mspMap[item.crop_id]) : null;

        return {
          ...item,
          current_price: currentPrice,
          predicted_price: predictedPrice,
          harvest_price: harvestPrice,
          price_change_pct: priceChangePct ? Number(priceChangePct) : null,
          msp_price: mspPrice,
          total_value: totalValue ? Math.round(totalValue) : null,
          wait_vs_sell_profit_diff: waitVsSellProfitDiff,
          optimal_action: optimalAction,
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
    const { farmerId } = req.farmer || {};

    if (!crop_id) {
      return res.status(400).json({ success: false, data: null, message: "crop_id is required" });
    }

    // Get latest price for this crop (best mandi if mandi_id not specified)
    let priceQuery;
    let priceParams;

    if (mandi_id) {
      [priceQuery] = await db.query(
        `SELECT p.modal_price, p.predicted_price, p.predicted_lower, p.predicted_upper,
                p.price_date, m.name AS mandi_name, c.name AS crop_name
         FROM prices p
         JOIN mandis m ON p.mandi_id = m.id
         JOIN crops c ON p.crop_id = c.id
         WHERE p.crop_id = ? AND p.mandi_id = ?
         ORDER BY p.price_date DESC LIMIT 1`,
        [crop_id, mandi_id]
      );
    } else {
      // Best mandi (highest modal price today)
      [priceQuery] = await db.query(
        `SELECT p.modal_price, p.predicted_price, p.predicted_lower, p.predicted_upper,
                p.price_date, m.name AS mandi_name, m.id AS mandi_id, c.name AS crop_name
         FROM prices p
         JOIN mandis m ON p.mandi_id = m.id
         JOIN crops c ON p.crop_id = c.id
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
    let predictedPrice = priceRow.predicted_price ? Number(priceRow.predicted_price) : null;
    let predictedLower = priceRow.predicted_lower ? Number(priceRow.predicted_lower) : null;
    let predictedUpper = priceRow.predicted_upper ? Number(priceRow.predicted_upper) : null;

    if (!predictedPrice) {
      const livePrediction = await getPrediction(priceRow.crop_name, priceRow.mandi_name);
      if (livePrediction) {
        predictedPrice = livePrediction.predicted_price;
        predictedLower = livePrediction.predicted_lower;
        predictedUpper = livePrediction.predicted_upper;
      }
    }

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

    // Weather Advisory
    let isRainExpected = false;
    let weatherWarning = "";
    if (farmerId) {
      const [farmerRows] = await db.query("SELECT district FROM farmers WHERE id = ?", [farmerId]);
      if (farmerRows.length && farmerRows[0].district) {
        const district = farmerRows[0].district;
        const weather = await checkRainForecast(district);
        if (weather.isRainExpected) {
          isRainExpected = true;
          weatherWarning = `🌧️ Heavy rain expected in ${district} for next 3 days. Consider harvesting and selling to avoid spoilage. `;
          signal = "sell_urgent";
          recommendation = weatherWarning + " " + recommendation;
        }
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
        predicted_lower: predictedLower,
        predicted_upper: predictedUpper,
        avg_7day: Math.round(avg7),
        mandi_name: priceRow.mandi_name,
        price_date: priceRow.price_date,
        wait_days: waitDays,
        total_value_now: totalValueNow,
        total_value_predicted: totalValuePredicted,
        weather_warning: weatherWarning,
        is_rain_expected: isRainExpected,
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

// ── Compare Mandis Engine ───────────────────────────────────────────────────────

const compareMandis = async (req, res) => {
  try {
    const { crop_id, quantity_quintals, farmer_district, farmer_state } = req.body;

    if (!crop_id || !quantity_quintals) {
      return res.status(400).json({ success: false, message: "Crop and quantity are required" });
    }

    const qty = Number(quantity_quintals);

    // Get latest prices for this crop in all mandis
    const [prices] = await db.query(
      `SELECT p.mandi_id, m.name AS mandi_name, m.district, m.state, p.modal_price, p.price_date
       FROM prices p
       JOIN mandis m ON p.mandi_id = m.id
       WHERE p.crop_id = ?
         AND p.price_date = (
           SELECT MAX(p2.price_date) FROM prices p2 WHERE p2.crop_id = ?
         )`,
      [crop_id, crop_id]
    );

    if (!prices.length) {
      return res.json({ success: true, data: [], message: "No price data for this crop" });
    }

    const userDistrict = String(farmer_district || "").trim().toLowerCase();
    const userState = String(farmer_state || "").trim().toLowerCase();

    // Map through prices and calculate transport cost and net profit
    const comparisons = prices.map((mandi) => {
      const mandiDistrict = String(mandi.district || "").trim().toLowerCase();
      const mandiState = String(mandi.state || "").trim().toLowerCase();

      // Default Transport Cost rule
      let transportRatePerQuintal = 50; // Default: same district

      if (userState && mandiState && userState !== mandiState) {
        transportRatePerQuintal = 300; // different state
      } else if (userDistrict && mandiDistrict && userDistrict !== mandiDistrict) {
        transportRatePerQuintal = 150; // different district, same state
      }

      const totalTransportCost = transportRatePerQuintal * qty;
      const grossRevenue = Number(mandi.modal_price) * qty;
      const netProfit = grossRevenue - totalTransportCost;

      return {
        mandi_id: mandi.mandi_id,
        mandi_name: mandi.mandi_name,
        district: mandi.district,
        state: mandi.state,
        modal_price: Number(mandi.modal_price),
        transport_rate_per_quintal: transportRatePerQuintal,
        total_transport_cost: totalTransportCost,
        gross_revenue: grossRevenue,
        net_profit: netProfit,
      };
    });

    // Sort by highest net profit
    comparisons.sort((a, b) => b.net_profit - a.net_profit);

    // Return top 10
    const topComparisons = comparisons.slice(0, 10);

    // Fetch community prices for these top mandis
    for (const comp of topComparisons) {
      const [cpRows] = await db.query(
        `SELECT AVG(actual_price) AS avg_community_price, COUNT(id) as report_count
         FROM farmer_sales
         WHERE crop_id = ? AND mandi_id = ? AND sold_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
        [crop_id, comp.mandi_id]
      );
      if (cpRows[0] && cpRows[0].report_count > 0) {
        comp.community_price = Math.round(Number(cpRows[0].avg_community_price));
        comp.community_reports = cpRows[0].report_count;
      }
    }

    return res.json({
      success: true,
      data: topComparisons,
      message: "Mandi comparison generated"
    });
  } catch (error) {
    logWarn(`compareMandis failed: ${error.message}`);
    return res.status(500).json({ success: false, data: null, message: "Failed to compare mandis" });
  }
};

// ── Transporters ──────────────────────────────────────────────────────────────────

const getTransporters = async (req, res) => {
  try {
    const district = req.query.district || "";
    // Get transporters for district, or some defaults if district not matched
    let [rows] = await db.query(
      "SELECT * FROM transporters WHERE LOWER(district) = LOWER(?)",
      [district]
    );

    // If no transporters for district, return some generic ones or none
    if (rows.length === 0) {
      [rows] = await db.query("SELECT * FROM transporters LIMIT 5");
    }

    return res.json({ success: true, data: rows, message: "Transporters fetched" });
  } catch (error) {
    logWarn(`getTransporters failed: ${error.message}`);
    return res.status(500).json({ success: false, data: null, message: "Failed to fetch transporters" });
  }
};

// ── Confirm Sale ────────────────────────────────────────────────────────────────

const confirmSale = async (req, res) => {
  try {
    const { farmerId } = req.farmer;
    const { stock_id, crop_id, mandi_id, quantity_quintals, actual_price, predicted_price } = req.body;

    if (!stock_id || !crop_id || !quantity_quintals || !actual_price) {
      return res.status(400).json({ success: false, message: "Missing required sale details" });
    }

    const qtySold = Number(quantity_quintals);

    // Verify stock exists and farmer owns it
    const [stockRows] = await db.query(
      "SELECT quantity_quintals FROM farmer_stock WHERE id = ? AND farmer_id = ?",
      [stock_id, farmerId]
    );

    if (stockRows.length === 0) {
      return res.status(404).json({ success: false, message: "Stock not found" });
    }

    const currentQty = Number(stockRows[0].quantity_quintals);
    if (qtySold > currentQty) {
      return res.status(400).json({ success: false, message: "Cannot sell more than you have" });
    }

    // Insert into farmer_sales
    await db.query(
      `INSERT INTO farmer_sales (farmer_id, crop_id, mandi_id, quantity_quintals, actual_price, predicted_price, sold_date)
       VALUES (?, ?, ?, ?, ?, ?, CURDATE())`,
      [farmerId, crop_id, mandi_id || null, qtySold, actual_price, predicted_price || null]
    );

    // Update or Delete stock
    if (qtySold >= currentQty) {
      await db.query("DELETE FROM farmer_stock WHERE id = ?", [stock_id]);
    } else {
      await db.query("UPDATE farmer_stock SET quantity_quintals = quantity_quintals - ? WHERE id = ?", [qtySold, stock_id]);
    }

    return res.json({ success: true, message: "Sale confirmed successfully" });
  } catch (error) {
    logWarn(`confirmSale failed: ${error.message}`);
    return res.status(500).json({ success: false, message: "Failed to confirm sale" });
  }
};

// ── Sales History ────────────────────────────────────────────────────────────────

const getSalesHistory = async (req, res) => {
  try {
    const { farmerId } = req.farmer;

    const [rows] = await db.query(
      `SELECT s.id, s.crop_id, s.quantity_quintals, s.actual_price, s.predicted_price, s.sold_date,
              c.name AS crop_name, m.name AS mandi_name
       FROM farmer_sales s
       JOIN crops c ON s.crop_id = c.id
       LEFT JOIN mandis m ON s.mandi_id = m.id
       WHERE s.farmer_id = ?
       ORDER BY s.sold_date DESC, s.created_at DESC`,
      [farmerId]
    );

    // Enrich each sale with expense data (most recent expense for that crop by this farmer)
    const enriched = await Promise.all(rows.map(async (sale) => {
      const qty = Number(sale.quantity_quintals);
      const actualPrice = Number(sale.actual_price);
      const totalRevenue = Math.round(qty * actualPrice);

      // Find the most recent expense entry for this crop
      const [expRows] = await db.query(
        `SELECT fertiliser_cost, labour_cost, water_cost, seed_cost, expected_yield_quintals
         FROM farmer_expenses
         WHERE farmer_id = ? AND crop_id = ?
         ORDER BY created_at DESC LIMIT 1`,
        [farmerId, sale.crop_id]
      );

      let costPerQuintal = null;
      let totalCost = null;
      let netProfit = null;
      let profitMarginPct = null;
      let expenseBreakdown = null;

      if (expRows.length > 0) {
        const exp = expRows[0];
        const rawTotal = Number(exp.fertiliser_cost) + Number(exp.labour_cost) +
                         Number(exp.water_cost) + Number(exp.seed_cost);
        const yieldQ = Number(exp.expected_yield_quintals);
        costPerQuintal = yieldQ > 0 ? Math.round(rawTotal / yieldQ) : 0;
        totalCost = Math.round(costPerQuintal * qty);
        netProfit = totalRevenue - totalCost;
        profitMarginPct = totalCost > 0 ? (((netProfit) / totalCost) * 100).toFixed(1) : null;
        expenseBreakdown = {
          fertiliser_cost: Number(exp.fertiliser_cost),
          labour_cost: Number(exp.labour_cost),
          water_cost: Number(exp.water_cost),
          seed_cost: Number(exp.seed_cost),
          expected_yield_quintals: yieldQ
        };
      }

      return {
        ...sale,
        total_revenue: totalRevenue,
        cost_per_quintal: costPerQuintal,
        total_cost: totalCost,
        net_profit: netProfit,
        profit_margin_pct: profitMarginPct,
        expense_breakdown: expenseBreakdown,
        has_expenses: expRows.length > 0
      };
    }));

    return res.json({ success: true, data: enriched, message: "Sales history fetched" });
  } catch (error) {
    logWarn(`getSalesHistory failed: ${error.message}`);
    return res.status(500).json({ success: false, message: "Failed to fetch sales history" });
  }
};

// ── Community Prices ────────────────────────────────────────────────────────────────

const getCommunityPrices = async (req, res) => {
  try {
    const { crop_id, mandi_id } = req.query;

    if (!crop_id || !mandi_id) {
      return res.status(400).json({ success: false, message: "crop_id and mandi_id are required" });
    }

    // Get average actual price from farmer_sales for the last 3 days
    const [rows] = await db.query(
      `SELECT AVG(actual_price) AS avg_community_price, COUNT(id) as report_count
       FROM farmer_sales
       WHERE crop_id = ? AND mandi_id = ? AND sold_date >= DATE_SUB(CURDATE(), INTERVAL 3 DAY)`,
      [crop_id, mandi_id]
    );

    const data = rows[0] && rows[0].report_count > 0 ? {
      avg_community_price: Math.round(Number(rows[0].avg_community_price)),
      report_count: rows[0].report_count
    } : null;

    return res.json({ success: true, data, message: "Community prices fetched" });
  } catch (error) {
    logWarn(`getCommunityPrices failed: ${error.message}`);
    return res.status(500).json({ success: false, message: "Failed to fetch community prices" });
  }
};

module.exports = { listStock, addStock, updateStock, deleteStock, getPortfolio, getSellAdvice, compareMandis, getTransporters, confirmSale, getSalesHistory, getCommunityPrices };
