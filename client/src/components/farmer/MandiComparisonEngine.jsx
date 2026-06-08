import React, { useState, useEffect } from "react";
import { compareMandis, getCrops } from "../../api";

const MandiComparisonEngine = ({ farmerLocation }) => {
  const [crops, setCrops] = useState([]);
  const [formData, setFormData] = useState({
    cropId: "",
    quantity: ""
  });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCrops();
  }, []);

  const fetchCrops = async () => {
    try {
      const data = await getCrops();
      setCrops(data);
    } catch (err) {
      console.error("Failed to load crops for mandi comparison", err);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCompare = async (e) => {
    e.preventDefault();
    if (!formData.cropId || !formData.quantity) return;

    setLoading(true);
    setError(null);
    try {
      const data = await compareMandis({
        cropId: formData.cropId,
        quantity: formData.quantity,
        latitude: farmerLocation?.lat,
        longitude: farmerLocation?.lng,
        district: farmerLocation?.district,
        state: farmerLocation?.state
      });
      setResults(data.options);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to compare mandis");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mandi-comp-shell">
      <div className="mandi-comp-header">
        <h2 className="mandi-comp-title">Mandi Comparison Engine</h2>
        <p className="mandi-comp-subtitle">Find the most profitable market for your produce after transport costs.</p>
      </div>

      <form className="mandi-comp-form" onSubmit={handleCompare}>
        <div className="sell-panel-field">
          <label className="sell-panel-label">Crop</label>
          <select 
            className="sell-panel-select" 
            name="cropId" 
            value={formData.cropId} 
            onChange={handleChange}
            required
          >
            <option value="">Select Crop</option>
            {crops.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="sell-panel-field">
          <label className="sell-panel-label">Quantity (Quintals)</label>
          <input 
            type="number" 
            className="sell-panel-input" 
            name="quantity" 
            value={formData.quantity} 
            onChange={handleChange}
            placeholder="e.g. 50"
            min="1"
            required
          />
        </div>

        <button 
          type="submit" 
          className="mandi-comp-btn"
          disabled={loading || !formData.cropId || !formData.quantity}
        >
          {loading ? "Calculating..." : "Compare Prices"}
        </button>
      </form>

      {error && (
        <div className="farmer-wh-error" style={{ marginBottom: '2rem' }}>
          {error}
        </div>
      )}

      {results && results.length > 0 && (
        <div className="mandi-comp-leaderboard">
          {results.map((mandi, index) => (
            <div key={mandi.mandiId} className={`mandi-comp-card ${index === 0 ? 'mandi-comp-card--rank-1' : ''}`}>
              <div className="mandi-comp-info">
                <div className="mandi-comp-name">{mandi.mandiName}</div>
                <div className="mandi-comp-location">
                  {mandi.district}, {mandi.state}
                  {mandi.distanceKm && ` • ~${mandi.distanceKm} km`}
                </div>
              </div>
              <div className="mandi-comp-stats">
                <div className="mandi-comp-stat">
                  <span className="mandi-comp-stat-label">Market Price</span>
                  <span className="mandi-comp-stat-val">₹{mandi.price}/q</span>
                </div>
                <div className="mandi-comp-stat" style={{ opacity: 0.8 }}>
                  <span className="mandi-comp-stat-label">Est. Transport</span>
                  <span className="mandi-comp-stat-val mandi-comp-stat-val--red">-₹{mandi.transportCost}</span>
                </div>
                <div className="mandi-comp-stat">
                  <span className="mandi-comp-stat-label">Net Profit</span>
                  <span className={`mandi-comp-stat-val ${index === 0 ? 'mandi-comp-stat-val--green' : ''}`}>
                    ₹{mandi.netProfit.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {results && results.length === 0 && (
        <div className="farmer-dash-empty">
          <p>No mandi prices found for this crop today.</p>
        </div>
      )}
    </div>
  );
};

export default MandiComparisonEngine;
