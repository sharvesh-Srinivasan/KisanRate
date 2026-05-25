const db = require("../config/db");

const timestamp = () => new Date().toISOString();
const logWarn = (message) => {
  process.stderr.write(`[WARN] ${timestamp()} ${message}\n`);
};

const listFarmers = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT f.id, f.phone, f.name, f.subscribed,
              c.name AS crop_name, m.name AS mandi_name
       FROM farmers f
       LEFT JOIN crops c ON f.preferred_crop_id = c.id
       LEFT JOIN mandis m ON f.preferred_mandi_id = m.id
       ORDER BY f.created_at DESC`
    );

    return res.json({
      success: true,
      data: rows,
      message: "Farmers fetched"
    });
  } catch (error) {
    logWarn(`Fetch farmers failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      data: null,
      message: "Failed to fetch farmers"
    });
  }
};

const updateFarmer = async (req, res) => {
  try {
    const { id } = req.params;
    const { subscribed, preferred_crop_id, preferred_mandi_id, name } =
      req.body || {};

    await db.query(
      `UPDATE farmers
       SET subscribed = COALESCE(?, subscribed),
           preferred_crop_id = COALESCE(?, preferred_crop_id),
           preferred_mandi_id = COALESCE(?, preferred_mandi_id),
           name = COALESCE(?, name)
       WHERE id = ?`,
      [subscribed, preferred_crop_id, preferred_mandi_id, name, id]
    );

    return res.json({
      success: true,
      data: null,
      message: "Farmer updated"
    });
  } catch (error) {
    logWarn(`Update farmer failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      data: null,
      message: "Failed to update farmer"
    });
  }
};

const deleteFarmer = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM farmers WHERE id = ?", [id]);

    return res.json({
      success: true,
      data: null,
      message: "Farmer deleted"
    });
  } catch (error) {
    logWarn(`Delete farmer failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      data: null,
      message: "Failed to delete farmer"
    });
  }
};

module.exports = { listFarmers, updateFarmer, deleteFarmer };
