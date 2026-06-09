import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getCrops, getFarmerStock, addFarmerStock, updateFarmerStock, deleteFarmerStock } from "../api";
import SellCropModal from "../components/farmer/SellCropModal";

const FarmerWarehouse = () => {
  const navigate = useNavigate();
  const [stock, setStock] = useState([]);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [sellItem, setSellItem] = useState(null);
  
  const [farmer, setFarmer] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    crop_id: "",
    quantity_quintals: "",
    harvest_date: "",
    storage_location: ""
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [stockRes, cropsRes] = await Promise.all([
        getFarmerStock(),
        getCrops()
      ]);
      if (stockRes.success) setStock(stockRes.data);
      if (cropsRes.success) setCrops(cropsRes.data);
    } catch (err) {
      if (err?.response?.status === 401) {
        navigate("/farmer/login");
      } else {
        setError("Failed to load warehouse data");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const token = localStorage.getItem("kisanrate_farmer_token");
    if (!token) {
      navigate("/farmer/login");
      return;
    }
    const farmerData = localStorage.getItem("kisanrate_farmer");
    if (farmerData) {
      try { setFarmer(JSON.parse(farmerData)); } catch {}
    }
    loadData();
  }, [navigate, loadData]);

  const openModal = (item = null) => {
    if (item) {
      setEditingId(item.id);
      setForm({
        crop_id: item.crop_id || "",
        quantity_quintals: item.quantity_quintals || "",
        harvest_date: item.harvest_date ? item.harvest_date.slice(0, 10) : "",
        storage_location: item.storage_location || ""
      });
    } else {
      setEditingId(null);
      setForm({ crop_id: "", quantity_quintals: "", harvest_date: "", storage_location: "" });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm({ crop_id: "", quantity_quintals: "", harvest_date: "", storage_location: "" });
    setEditingId(null);
    setError("");
  };

  const openSellModal = (item) => {
    setSellItem(item);
    setSellModalOpen(true);
  };

  const closeSellModal = () => {
    setSellModalOpen(false);
    setSellItem(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.crop_id || !form.quantity_quintals) {
      setError("Crop and Quantity are required");
      return;
    }

    try {
      if (editingId) {
        await updateFarmerStock(editingId, form);
      } else {
        await addFarmerStock(form);
      }
      closeModal();
      loadData();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save stock entry");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this stock entry?")) return;
    try {
      await deleteFarmerStock(id);
      loadData();
    } catch (err) {
      setError("Failed to delete entry");
    }
  };

  if (loading) return <div className="farmer-wh-shell"><div className="farmer-wh-loading">Loading warehouse…</div></div>;

  return (
    <div className="farmer-wh-shell">
      <div className="farmer-wh-container">
        {/* Header */}
        <div className="farmer-wh-header">
          <div>
            <button className="farmer-wh-back-btn" onClick={() => navigate("/farmer/dashboard")}>
              ← Back to Dashboard
            </button>
            <h1 className="farmer-wh-title">My Warehouse</h1>
            <p className="farmer-wh-subtitle">Manage the crops you currently hold in storage</p>
          </div>
          <button className="farmer-wh-add-btn" onClick={() => openModal()}>
            + Add Stock
          </button>
        </div>

        {error && <div className="farmer-wh-error">{error}</div>}

        {/* Table */}
        <div className="farmer-wh-table-wrap">
          {stock.length === 0 ? (
            <div className="farmer-wh-empty">
              No crops in your warehouse. Add some to track their market value.
            </div>
          ) : (
            <table className="farmer-wh-table">
              <thead>
                <tr>
                  <th>Crop</th>
                  <th>Quantity (Quintals)</th>
                  <th>Harvest Date</th>
                  <th>Storage Location</th>
                  <th>Added On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.crop_name}</strong></td>
                    <td>{item.quantity_quintals}</td>
                    <td>{item.harvest_date ? new Date(item.harvest_date).toLocaleDateString("en-IN") : "—"}</td>
                    <td>{item.storage_location || "—"}</td>
                    <td>{new Date(item.created_at).toLocaleDateString("en-IN")}</td>
                    <td>
                      <div className="farmer-wh-actions">
                        <button className="farmer-wh-sell-btn" onClick={() => openSellModal(item)}>Sell</button>
                        <button className="farmer-wh-edit-btn" onClick={() => openModal(item)}>Edit</button>
                        <button className="farmer-wh-del-btn" onClick={() => handleDelete(item.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="farmer-wh-modal-backdrop">
          <div className="farmer-wh-modal">
            <div className="farmer-wh-modal-header">
              <h2>{editingId ? "Edit Stock" : "Add Stock"}</h2>
              <button className="farmer-wh-modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="farmer-wh-form">
              <div className="farmer-wh-field">
                <label>Crop *</label>
                <select
                  value={form.crop_id}
                  onChange={(e) => setForm({ ...form, crop_id: e.target.value })}
                  disabled={editingId != null}
                >
                  <option value="">Select a crop…</option>
                  {crops.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="farmer-wh-field">
                <label>Quantity (Quintals) *</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={form.quantity_quintals}
                  onChange={(e) => setForm({ ...form, quantity_quintals: e.target.value })}
                  placeholder="e.g. 50"
                />
              </div>
              <div className="farmer-wh-field">
                <label>Harvest Date</label>
                <input
                  type="date"
                  value={form.harvest_date}
                  onChange={(e) => setForm({ ...form, harvest_date: e.target.value })}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="farmer-wh-field">
                <label>Storage Location</label>
                <input
                  type="text"
                  value={form.storage_location}
                  onChange={(e) => setForm({ ...form, storage_location: e.target.value })}
                  placeholder="e.g. Home Godown"
                />
              </div>
              <button type="submit" className="farmer-wh-submit-btn">
                {editingId ? "Save Changes" : "Add to Warehouse"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Sell Modal */}
      {sellModalOpen && sellItem && (
        <SellCropModal
          item={sellItem}
          farmerProfile={farmer}
          onClose={closeSellModal}
        />
      )}
    </div>
  );
};

export default FarmerWarehouse;
