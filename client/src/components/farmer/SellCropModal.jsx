import React, { useState } from "react";
import { getFarmerSellAdvice, compareMandis, getTransporters, confirmFarmerSale } from "../../api";

const SellCropModal = ({ item, farmerProfile, onClose, onSaleConfirmed }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1 State
  const [quantityToSell, setQuantityToSell] = useState(item.quantity_quintals);

  // Step 2 State
  const [advice, setAdvice] = useState(null);
  const [bestMandis, setBestMandis] = useState([]);
  const [selectedMandi, setSelectedMandi] = useState(null);

  // Step 3 State
  const [transporters, setTransporters] = useState([]);
  const [actualPrice, setActualPrice] = useState("");

  // ----- STEP 1 -> STEP 2 -----
  const handleProceedToMandi = async () => {
    const qty = Number(quantityToSell);
    if (!qty || qty <= 0 || qty > Number(item.quantity_quintals)) {
      setError("Please enter a valid quantity (up to your total stock).");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const district = farmerProfile?.district || "";
      const state = farmerProfile?.state || "";

      const [adviceRes, compareRes] = await Promise.all([
        getFarmerSellAdvice({ crop_id: item.crop_id, quantity: qty }),
        compareMandis({
          crop_id: item.crop_id,
          quantity_quintals: qty,
          farmer_district: district,
          farmer_state: state
        })
      ]);

      if (adviceRes.success) setAdvice(adviceRes.data);
      if (compareRes.success && compareRes.data.length > 0) {
        setBestMandis(compareRes.data.slice(0, 3)); // Top 3 mandis
        setSelectedMandi(compareRes.data[0]); // Default to top mandi
      }
      setStep(2);
    } catch (err) {
      setError("Failed to fetch market data.");
    } finally {
      setLoading(false);
    }
  };

  // ----- STEP 2 -> STEP 3 -----
  const handleProceedToTransport = async () => {
    if (!selectedMandi) {
      setError("Please select a mandi to sell at.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const transRes = await getTransporters(farmerProfile?.district || "");
      if (transRes.success) {
        setTransporters(transRes.data);
      }
      setActualPrice(selectedMandi.modal_price); // Default actual price to modal price
      setStep(3);
    } catch (err) {
      setError("Failed to load transport options.");
    } finally {
      setLoading(false);
    }
  };

  // ----- STEP 3 (CONFIRM SALE) -----
  const handleConfirmSale = async () => {
    const price = Number(actualPrice);
    if (!price || price <= 0) {
      setError("Please enter the actual price received.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await confirmFarmerSale({
        stock_id: item.id,
        crop_id: item.crop_id,
        mandi_id: selectedMandi.mandi_id,
        quantity_quintals: quantityToSell,
        actual_price: price,
        predicted_price: selectedMandi.predicted_price || advice?.predicted_price || null
      });

      if (res.success) {
        if (onSaleConfirmed) onSaleConfirmed();
        onClose();
      } else {
        setError(res.message || "Failed to confirm sale");
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to confirm sale");
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="farmer-wh-modal-backdrop" style={{ zIndex: 1000 }}>
      <div className="farmer-sell-modal">
        <div className="farmer-wh-modal-header">
          <h2>Sell {item.crop_name}</h2>
          <button className="farmer-wh-modal-close" onClick={onClose}>×</button>
        </div>

        {error && <div className="farmer-wh-error" style={{ marginBottom: "1rem" }}>{error}</div>}

        {/* STEP 1 */}
        {step === 1 && (
          <div className="farmer-sell-step">
            <h3 className="farmer-sell-section-title" style={{ borderBottom: "none", paddingBottom: 0 }}>How much are you selling?</h3>
            <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1.5rem" }}>
              You currently hold <strong>{item.quantity_quintals} Quintals</strong> in your warehouse.
            </p>
            <div className="farmer-wh-field">
              <label>Quantity to Sell (Quintals)</label>
              <input 
                type="number" 
                value={quantityToSell} 
                onChange={(e) => setQuantityToSell(e.target.value)} 
                max={item.quantity_quintals} 
                min="0.1" 
                step="0.1" 
              />
            </div>
            <button 
              className="farmer-wh-submit-btn" 
              onClick={handleProceedToMandi} 
              disabled={loading}
              style={{ width: "100%", marginTop: "2rem" }}
            >
              {loading ? "Analyzing Markets..." : "Find Best Markets ➔"}
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="farmer-sell-step">
            {/* AI Recommendation */}
            {advice && (
              <div className={`farmer-sell-alert ${advice.signal === 'hold' ? 'farmer-sell-alert--wait' : advice.signal === 'sell_urgent' ? 'farmer-sell-alert--urgent' : 'farmer-sell-alert--sell'}`} style={{ marginBottom: "1.5rem", border: advice.signal === 'sell_urgent' ? "1px solid #ef4444" : undefined, backgroundColor: advice.signal === 'sell_urgent' ? "#fef2f2" : undefined }}>
                <div className="farmer-sell-alert-icon">
                  {advice.signal === 'hold' ? '⏳' : advice.signal === 'sell_urgent' ? '🚨' : '✅'}
                </div>
                <div>
                  <h4 style={{ color: advice.signal === 'sell_urgent' ? '#b91c1c' : undefined }}>
                    {advice.signal === 'hold' ? 'Wait Recommendation' : advice.signal === 'sell_urgent' ? 'Urgent Action Recommended' : 'Good to Sell'}
                  </h4>
                  <p style={{ color: advice.signal === 'sell_urgent' ? '#991b1b' : undefined }}>{advice.recommendation}</p>
                </div>
              </div>
            )}

            <h3 className="farmer-sell-section-title">Select a Market</h3>
            {bestMandis.length > 0 ? (
              <div className="farmer-sell-mandis" style={{ marginTop: "1rem", gap: "0.75rem" }}>
                {bestMandis.map((mandi, idx) => {
                  const isSelected = selectedMandi?.mandi_id === mandi.mandi_id;
                  return (
                    <div 
                      key={mandi.mandi_id} 
                      className={`farmer-sell-mandi-card ${isSelected ? 'top-mandi' : ''}`}
                      style={{ cursor: "pointer", border: isSelected ? "2px solid #10b981" : "1px solid #e2e8f0" }}
                      onClick={() => setSelectedMandi(mandi)}
                    >
                      <div className="mandi-card-header">
                        <div className="mandi-card-title">
                          <span className="mandi-name">{mandi.mandi_name}</span>
                          {idx === 0 && <span className="mandi-badge" style={{ marginLeft: "8px" }}>Best Profit</span>}
                        </div>
                        <div className="mandi-location">{mandi.district}, {mandi.state}</div>
                      </div>
                      <div className="mandi-card-stats">
                        <div className="mandi-stat">
                          <span>Price/Q</span>
                          <strong>₹{mandi.modal_price}</strong>
                        </div>
                        <div className="mandi-stat text-red">
                          <span>Est. Transport</span>
                          <strong>-₹{mandi.total_transport_cost}</strong>
                        </div>
                        <div className="mandi-stat text-green">
                          <span>Net Profit</span>
                          <strong>₹{mandi.net_profit.toLocaleString()}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="farmer-sell-empty">No active markets found for this crop today.</p>
            )}

            <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
              <button 
                className="farmer-wh-back-btn" 
                onClick={() => setStep(1)} 
                style={{ flex: 1, margin: 0, padding: "1rem" }}
              >
                Back
              </button>
              <button 
                className="farmer-wh-submit-btn" 
                onClick={handleProceedToTransport} 
                disabled={loading || !selectedMandi}
                style={{ flex: 2, margin: 0 }}
              >
                {loading ? "Loading..." : "Arrange Transport ➔"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="farmer-sell-step">
            <h3 className="farmer-sell-section-title">Logistics & Transport</h3>
            <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "0.5rem 0 1.5rem 0" }}>
              Target: <strong>{selectedMandi?.mandi_name}</strong>
            </p>

            <div className="farmer-sell-logistics">
              {/* Self transport card */}
              <div className="logistics-card" style={{ border: "2px solid #e2e8f0" }}>
                <div className="logistics-icon">🚜</div>
                <div className="logistics-info">
                  <div className="logistics-name">Self Transport</div>
                  <div className="logistics-type">{selectedMandi?.district}</div>
                </div>
                <div className="logistics-contact">
                  <a href={`https://maps.google.com/?q=${selectedMandi?.mandi_name}+Mandi+${selectedMandi?.district}`} target="_blank" rel="noreferrer" style={{ background: "#3b82f6" }}>
                    🗺️ Directions
                  </a>
                </div>
              </div>

              {/* Dummy Transporter 1 for use case */}
              <div className="logistics-card">
                <div className="logistics-icon">🚛</div>
                <div className="logistics-info">
                  <div className="logistics-name">Agri Logistics Pro</div>
                  <div className="logistics-type">Heavy Truck • ₹65/Q</div>
                </div>
                <div className="logistics-contact">
                  <a href="tel:+919876543210">
                    📞 +91 98765 43210
                  </a>
                </div>
              </div>

              {/* Dummy Transporter 2 for use case */}
              <div className="logistics-card">
                <div className="logistics-icon">🛻</div>
                <div className="logistics-info">
                  <div className="logistics-name">Quick Farm Transport</div>
                  <div className="logistics-type">Mini Truck • ₹80/Q</div>
                </div>
                <div className="logistics-contact">
                  <a href="tel:+918765432109">
                    📞 +91 87654 32109
                  </a>
                </div>
              </div>

              {/* DB Transporters */}
              {transporters.map((trans, idx) => (
                <div key={idx} className="logistics-card">
                  <div className="logistics-icon">🚚</div>
                  <div className="logistics-info">
                    <div className="logistics-name">{trans.name}</div>
                    <div className="logistics-type">{trans.type || "Truck"} • ₹{trans.rate_per_quintal}/Q</div>
                  </div>
                  <div className="logistics-contact">
                    <a href={`tel:${trans.phone.replace(/\s+/g, '')}`}>
                      📞 {trans.phone}
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "2rem", padding: "1.5rem", background: "#f8fafc", borderRadius: "0.75rem", border: "1px solid #e2e8f0" }}>
              <h3 className="farmer-sell-section-title" style={{ borderBottom: "none", paddingBottom: 0, marginBottom: "1rem" }}>Confirm Sale</h3>
              <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1rem" }}>
                Enter the final price you received per quintal to track your profit accuracy.
              </p>
              <div className="farmer-wh-field">
                <label>Actual Price Received (₹/Q)</label>
                <input 
                  type="number" 
                  value={actualPrice} 
                  onChange={(e) => setActualPrice(e.target.value)} 
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
              <button 
                className="farmer-wh-back-btn" 
                onClick={() => setStep(2)} 
                style={{ flex: 1, margin: 0, padding: "1rem" }}
              >
                Back
              </button>
              <button 
                className="farmer-wh-submit-btn" 
                onClick={handleConfirmSale} 
                disabled={loading}
                style={{ flex: 2, margin: 0 }}
              >
                {loading ? "Confirming..." : "Confirm Sale ✓"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SellCropModal;
