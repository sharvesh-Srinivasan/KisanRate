const db = require("../config/db");

const timestamp = () => new Date().toISOString();
const logWarn = (msg) => process.stderr.write(`[WARN] ${timestamp()} ${msg}\n`);

// ── Expenses ─────────────────────────────────────────────────────────────

const getExpenses = async (req, res) => {
  try {
    const { farmerId } = req.farmer;

    const [rows] = await db.query(
      `SELECT e.*, c.name AS crop_name
       FROM farmer_expenses e
       JOIN crops c ON e.crop_id = c.id
       WHERE e.farmer_id = ?
       ORDER BY e.created_at DESC`,
      [farmerId]
    );

    // Calculate total cost per quintal for each entry
    const data = rows.map(r => {
      const totalCost = Number(r.fertiliser_cost) + Number(r.labour_cost) + Number(r.water_cost) + Number(r.seed_cost);
      const costPerQuintal = r.expected_yield_quintals > 0 ? totalCost / Number(r.expected_yield_quintals) : 0;
      return {
        ...r,
        total_cost: totalCost,
        cost_per_quintal: Math.round(costPerQuintal)
      };
    });

    return res.json({ success: true, data, message: "Expenses fetched" });
  } catch (error) {
    logWarn(`getExpenses failed: ${error.message}`);
    return res.status(500).json({ success: false, message: "Failed to fetch expenses" });
  }
};

const addExpense = async (req, res) => {
  try {
    const { farmerId } = req.farmer;
    const { crop_id, season, fertiliser_cost, labour_cost, water_cost, seed_cost, expected_yield_quintals } = req.body;

    if (!crop_id || !season || !expected_yield_quintals) {
      return res.status(400).json({ success: false, message: "Missing required expense details" });
    }

    await db.query(
      `INSERT INTO farmer_expenses 
       (farmer_id, crop_id, season, fertiliser_cost, labour_cost, water_cost, seed_cost, expected_yield_quintals)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        farmerId, crop_id, season, 
        fertiliser_cost || 0, labour_cost || 0, water_cost || 0, seed_cost || 0, 
        expected_yield_quintals
      ]
    );

    return res.status(201).json({ success: true, message: "Expense added successfully" });
  } catch (error) {
    logWarn(`addExpense failed: ${error.message}`);
    return res.status(500).json({ success: false, message: "Failed to add expense" });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const { farmerId } = req.farmer;
    const { id } = req.params;

    await db.query("DELETE FROM farmer_expenses WHERE id = ? AND farmer_id = ?", [id, farmerId]);

    return res.json({ success: true, message: "Expense deleted" });
  } catch (error) {
    logWarn(`deleteExpense failed: ${error.message}`);
    return res.status(500).json({ success: false, message: "Failed to delete expense" });
  }
};

module.exports = { getExpenses, addExpense, deleteExpense };
