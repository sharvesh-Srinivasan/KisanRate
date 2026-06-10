import React, { useState, useEffect } from "react";
import { getExpenses, addExpense, deleteExpense, getCrops } from "../../api";

const ExpenseTracker = () => {
  const [expenses, setExpenses] = useState([]);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    crop_id: "",
    season: "Kharif 2026",
    fertiliser_cost: "",
    labour_cost: "",
    water_cost: "",
    seed_cost: "",
    expected_yield_quintals: ""
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [expRes, cropsRes] = await Promise.all([
        getExpenses(),
        getCrops()
      ]);
      if (expRes.success) setExpenses(expRes.data);
      setCrops(cropsRes.data || []);
    } catch (err) {
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.crop_id || !formData.season || !formData.expected_yield_quintals) {
      setError("Crop, season, and expected yield are required.");
      return;
    }

    try {
      setLoading(true);
      const res = await addExpense(formData);
      if (res.success) {
        setShowForm(false);
        setFormData({
          crop_id: "",
          season: "Kharif 2026",
          fertiliser_cost: "",
          labour_cost: "",
          water_cost: "",
          seed_cost: "",
          expected_yield_quintals: ""
        });
        await fetchInitialData();
      }
    } catch (err) {
      setError("Failed to add expense.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense?")) return;
    try {
      setLoading(true);
      const res = await deleteExpense(id);
      if (res.success) {
        await fetchInitialData();
      }
    } catch (err) {
      setError("Failed to delete expense.");
      setLoading(false);
    }
  };

  return (
    <div className="farmer-dash-panel">
      <div className="farmer-dash-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Expense Tracker</h2>
        <button className="farmer-wh-submit-btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ Log Expense"}
        </button>
      </div>

      {error && <div className="farmer-wh-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '0.75rem', marginBottom: '2rem', border: '1px solid #e2e8f0' }}>
          <h3 className="farmer-sell-section-title" style={{ borderBottom: 'none', paddingBottom: 0 }}>Add New Expense</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="farmer-wh-field">
              <label>Crop</label>
              <select name="crop_id" value={formData.crop_id} onChange={handleInputChange} required>
                <option value="">Select Crop</option>
                {crops.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="farmer-wh-field">
              <label>Season</label>
              <input type="text" name="season" value={formData.season} onChange={handleInputChange} placeholder="e.g. Kharif 2026" required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="farmer-wh-field">
              <label>Seed Cost (₹)</label>
              <input type="number" name="seed_cost" value={formData.seed_cost} onChange={handleInputChange} />
            </div>
            <div className="farmer-wh-field">
              <label>Fertiliser Cost (₹)</label>
              <input type="number" name="fertiliser_cost" value={formData.fertiliser_cost} onChange={handleInputChange} />
            </div>
            <div className="farmer-wh-field">
              <label>Labour Cost (₹)</label>
              <input type="number" name="labour_cost" value={formData.labour_cost} onChange={handleInputChange} />
            </div>
            <div className="farmer-wh-field">
              <label>Water & Other Cost (₹)</label>
              <input type="number" name="water_cost" value={formData.water_cost} onChange={handleInputChange} />
            </div>
          </div>

          <div className="farmer-wh-field">
            <label>Expected Yield (Quintals)</label>
            <input type="number" name="expected_yield_quintals" value={formData.expected_yield_quintals} onChange={handleInputChange} required min="0.1" step="0.1" />
          </div>

          <button type="submit" className="farmer-wh-submit-btn" disabled={loading} style={{ marginTop: '1rem' }}>
            {loading ? "Saving..." : "Save Expense"}
          </button>
        </form>
      )}

      {expenses.length > 0 ? (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {expenses.map((exp) => (
            <div key={exp.id} className="mandi-comp-card" style={{ cursor: 'default' }}>
              <div className="mandi-comp-header" style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                <div className="mandi-comp-title">
                  <span className="mandi-name">{exp.crop_name}</span>
                  <span className="mandi-badge" style={{ marginLeft: '8px', background: '#e2e8f0', color: '#475569' }}>{exp.season}</span>
                </div>
                <button onClick={() => handleDelete(exp.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem', padding: 0 }}>×</button>
              </div>
              <div className="mandi-comp-stats">
                <div className="mandi-comp-stat">
                  <span className="mandi-comp-stat-label">Total Cost</span>
                  <span className="mandi-comp-stat-val">₹{exp.total_cost?.toLocaleString()}</span>
                </div>
                <div className="mandi-comp-stat">
                  <span className="mandi-comp-stat-label">Exp. Yield</span>
                  <span className="mandi-comp-stat-val">{exp.expected_yield_quintals} Q</span>
                </div>
                <div className="mandi-comp-stat">
                  <span className="mandi-comp-stat-label">Cost per Quintal</span>
                  <span className="mandi-comp-stat-val mandi-comp-stat-val--red">₹{exp.cost_per_quintal}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="farmer-dash-empty">
          <p>You haven't logged any expenses yet.</p>
        </div>
      )}
    </div>
  );
};

export default ExpenseTracker;
