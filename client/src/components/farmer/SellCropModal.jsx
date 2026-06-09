import React, { useState, useEffect } from "react";
import { getFarmerSellAdvice, compareMandis } from "../../api";

const SellCropModal = ({ item, farmerProfile, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [advice, setAdvice] = useState(null);
  const [bestMandis, setBestMandis] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const district = farmerProfile?.district || "";
        const state = farmerProfile?.state || "";

        // 1. Get Sell Advice
        const adviceRes = await getFarmerSellAdvice({
          crop_id: item.crop_id,
          quantity: item.quantity_quintals
        });
        
        if (adviceRes.success) {
          setAdvice(adviceRes.data);
        }

        // 2. Get Mandi Comparison
        const compareRes = await compareMandis({
          crop_id: item.crop_id,
          quantity_quintals: item.quantity_quintals,
          farmer_district: district,
          farmer_state: state
        });
        
        if (compareRes.success && compareRes.data.length > 0) {
          setBestMandis(compareRes.data.slice(0, 2)); // Get top 2 mandis
        }

      } catch (err) {
        console.error(err);
        setError("Failed to fetch selling options.");
      } finally {
        setLoading(false);
      }
    };

    if (item && item.crop_id) {
      fetchData();
    }
  }, [item, farmerProfile]);

  // Mock Logistics details (deterministically generated based on district)
  const getLogisticsForDistrict = (district) => {
    const districtName = district || "Your Area";
    return [
      { name: `Kisan Logistics (${districtName})`, phone: "98765 43210", type: "Truck / Tractor" },
      { name: `FastAgri Transporters`, phone: "91234 56789", type: "Mini-Truck" }
    ];
  };

  return (
    <div className="farmer-wh-modal-backdrop">
      <div className="farmer-sell-modal">
        <div className="farmer-wh-modal-header">
          <h2>Sell {item.crop_name}</h2>
          <button className="farmer-wh-modal-close" onClick={onClose}>×</button>
        </div>
        
        {loading ? (
          <div className="farmer-sell-loading">Analyzing best markets...</div>
        ) : error ? (
          <div className="farmer-wh-error">{error}</div>
        ) : (
          <div className="farmer-sell-content">
            
            {/* AI Recommendation */}
            {advice && (
              <div className={`farmer-sell-alert ${advice.signal === 'hold' ? 'farmer-sell-alert--wait' : 'farmer-sell-alert--sell'}`}>
                <div className="farmer-sell-alert-icon">
                  {advice.signal === 'hold' ? '⏳' : '✅'}
                </div>
                <div>
                  <h4>{advice.signal === 'hold' ? 'Wait Recommendation' : 'Good to Sell'}</h4>
                  <p>{advice.recommendation}</p>
                </div>
              </div>
            )}

            {/* Best Mandis */}
            <h3 className="farmer-sell-section-title">Best Markets for You</h3>
            {bestMandis.length > 0 ? (
              <div className="farmer-sell-mandis">
                {bestMandis.map((mandi, idx) => (
                  <div key={mandi.mandi_id} className={`farmer-sell-mandi-card ${idx === 0 ? 'top-mandi' : ''}`}>
                    <div className="mandi-card-header">
                      <div className="mandi-card-title">
                        <span className="mandi-name">{mandi.mandi_name}</span>
                        {idx === 0 && <span className="mandi-badge">Top Choice</span>}
                      </div>
                      <div className="mandi-location">{mandi.district}, {mandi.state}</div>
                    </div>
                    <div className="mandi-card-stats">
                      <div className="mandi-stat">
                        <span>Expected Price</span>
                        <strong>₹{mandi.modal_price}/q</strong>
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
                    <div className="mandi-contact">
                      📞 Mandi Office: <strong>99887 76655</strong>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="farmer-sell-empty">No active markets found for this crop today.</p>
            )}

            {/* Transport Options */}
            <h3 className="farmer-sell-section-title">Transportation Options</h3>
            <div className="farmer-sell-logistics">
              {getLogisticsForDistrict(farmerProfile?.district).map((logistics, idx) => (
                <div key={idx} className="logistics-card">
                  <div className="logistics-icon">🚚</div>
                  <div className="logistics-info">
                    <div className="logistics-name">{logistics.name}</div>
                    <div className="logistics-type">{logistics.type}</div>
                  </div>
                  <div className="logistics-contact">
                    <a href={`tel:${logistics.phone.replace(/\s+/g, '')}`}>
                      📞 {logistics.phone}
                    </a>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default SellCropModal;
