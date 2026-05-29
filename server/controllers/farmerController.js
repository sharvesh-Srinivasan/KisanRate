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

const normalizePhone = (phone) =>
  String(phone || "")
    .replace(/\D/g, "")
    .replace(/^91/, "");

const subscribeFarmer = async (req, res) => {
  try {
    const { phone, name, preferred_crop_id, preferred_mandi_id } = req.body || {};
    const normalized = normalizePhone(phone);

    if (!normalized || !preferred_crop_id || !preferred_mandi_id) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Phone, crop, and mandi are required"
      });
    }

    const [existing] = await db.query(
      "SELECT id FROM farmers WHERE phone = ? LIMIT 1",
      [normalized]
    );

    if (existing.length) {
      await db.query(
        "UPDATE farmers SET name = COALESCE(?, name), preferred_crop_id = ?, preferred_mandi_id = ?, subscribed = TRUE WHERE phone = ?",
        [name || null, preferred_crop_id, preferred_mandi_id, normalized]
      );
    } else {
      await db.query(
        "INSERT INTO farmers (phone, name, preferred_crop_id, preferred_mandi_id, subscribed) VALUES (?, ?, ?, ?, TRUE)",
        [normalized, name || null, preferred_crop_id, preferred_mandi_id]
      );
    }

    return res.json({
      success: true,
      data: null,
      message: "Subscription saved"
    });
  } catch (error) {
    logWarn(`Subscribe farmer failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      data: null,
      message: "Failed to subscribe"
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

module.exports = { listFarmers, updateFarmer, deleteFarmer, subscribeFarmer };
