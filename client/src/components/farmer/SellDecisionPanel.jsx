import { useState, useEffect } from "react";
import { getCrops, getMandis, getFarmerSellAdvice } from "../../api";

const signals = {
  hold: {
    icon: "⏳",
    label: "Wait to Sell",
    color: "amber",
    bg: "sell-panel--hold"
  },
  sell: {
    icon: "✅",
    label: "Sell Now",
    color: "emerald",
    bg: "sell-panel--sell"
  },
  sell_urgent: {
    icon: "⚠️",
    label: "Sell Urgently",
    color: "red",
    bg: "sell-panel--urgent"
  },
  neutral: {
    icon: "📊",
    label: "Checking…",
    color: "slate",
    bg: ""
  }
};

const SellDecisionPanel = () => {
  const [crops, setCrops] = useState([]);
  const [mandis, setMandis] = useState([]);
  const [form, setForm] = useState({
    crop_id: "",
    mandi_id: "",
    quantity: "",
    target_price: ""
  });
  const [advice, setAdvice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingMeta, setLoadingMeta] = useState(true);

  useEffect(() => {
    Promise.all([getCrops(), getMandis()])
      .then(([c, m]) => {
        setCrops(c.data || []);
        setMandis(m.data || []);
      })
      .finally(() => setLoadingMeta(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.crop_id) { setError("Please select a crop"); return; }
    setLoading(true);
    setError("");
    setAdvice(null);
    try {
      const params = { crop_id: form.crop_id };
      if (form.mandi_id) params.mandi_id = form.mandi_id;
      if (form.quantity) params.quantity = form.quantity;
      if (form.target_price) params.target_price = form.target_price;

      const res = await getFarmerSellAdvice(params);
      if (res.success) {
        setAdvice(res.data);
      } else {
        setError(res.message || "Could not generate advice");
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) =>
    n != null ? "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 }) : "—";

  const sig = advice ? (signals[advice.signal] || signals.neutral) : null;

  return (
    <div className="sell-panel">
      <div className="sell-panel-header">
        <div className="sell-panel-icon">💡</div>
        <div>
          <h2 className="sell-panel-title">Sell Decision Assistant</h2>
          <p className="sell-panel-subtitle">
            Tell us what you have — we'll tell you when to sell
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="sell-panel-form" noValidate>
        <div className="sell-panel-grid">
          {/* Crop */}
          <div className="sell-panel-field">
            <label className="sell-panel-label" htmlFor="sell-crop">Crop</label>
            <select
              id="sell-crop"
              className="sell-panel-select"
              value={form.crop_id}
              onChange={(e) => setForm((f) => ({ ...f, crop_id: e.target.value }))}
              disabled={loadingMeta}
            >
              <option value="">Select crop…</option>
              {crops.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Mandi (optional) */}
          <div className="sell-panel-field">
            <label className="sell-panel-label" htmlFor="sell-mandi">
              Mandi <span className="sell-panel-optional">(optional)</span>
            </label>
            <select
              id="sell-mandi"
              className="sell-panel-select"
              value={form.mandi_id}
              onChange={(e) => setForm((f) => ({ ...f, mandi_id: e.target.value }))}
              disabled={loadingMeta}
            >
              <option value="">Best available</option>
              {mandis.map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.district})</option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div className="sell-panel-field">
            <label className="sell-panel-label" htmlFor="sell-qty">
              Quantity (Quintals) <span className="sell-panel-optional">(optional)</span>
            </label>
            <input
              id="sell-qty"
              type="number"
              min="0"
              step="0.5"
              className="sell-panel-input"
              placeholder="e.g. 50"
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
            />
          </div>

          {/* Target price */}
          <div className="sell-panel-field">
            <label className="sell-panel-label" htmlFor="sell-target">
              Your Target Price (₹/Q) <span className="sell-panel-optional">(optional)</span>
            </label>
            <input
              id="sell-target"
              type="number"
              min="0"
              className="sell-panel-input"
              placeholder="e.g. 2800"
              value={form.target_price}
              onChange={(e) => setForm((f) => ({ ...f, target_price: e.target.value }))}
            />
          </div>
        </div>

        {error && (
          <div className="sell-panel-error">{error}</div>
        )}

        <button
          type="submit"
          className="sell-panel-submit-btn"
          disabled={loading || !form.crop_id}
          id="sell-advisor-submit-btn"
        >
          {loading ? (
            <>
              <span className="sell-panel-spinner" />
              Analysing…
            </>
          ) : (
            <>
              💡 Get Recommendation
            </>
          )}
        </button>
      </form>

      {/* Result */}
      {advice && !advice.no_data && sig && (
        <div className={`sell-panel-result ${sig.bg}`}>
          <div className="sell-panel-result-header">
            <span className="sell-panel-result-icon">{sig.icon}</span>
            <div>
              <div className="sell-panel-result-signal">{sig.label}</div>
              <div className="sell-panel-result-mandi">@ {advice.mandi_name}</div>
            </div>
            {advice.wait_days && (
              <div className="sell-panel-wait-badge">
                Wait {advice.wait_days} days
              </div>
            )}
          </div>

          <p className="sell-panel-recommendation">{advice.recommendation}</p>

          {/* Price comparison */}
          <div className="sell-panel-price-row">
            <div className="sell-panel-price-item">
              <span className="sell-panel-price-label">Current</span>
              <span className="sell-panel-price-value">{fmt(advice.current_price)}</span>
              <span className="sell-panel-price-unit">/Quintal</span>
            </div>
            <div className="sell-panel-price-divider">→</div>
            <div className="sell-panel-price-item">
              <span className="sell-panel-price-label">ML Prediction</span>
              <span className={`sell-panel-price-value ${advice.predicted_price > advice.current_price ? "sell-panel-price-value--up" : "sell-panel-price-value--down"}`}>
                {fmt(advice.predicted_price)}
              </span>
              <span className="sell-panel-price-unit">/Quintal</span>
            </div>
            {advice.total_value_now && (
              <>
                <div className="sell-panel-price-divider">·</div>
                <div className="sell-panel-price-item">
                  <span className="sell-panel-price-label">Total Now</span>
                  <span className="sell-panel-price-value">{fmt(advice.total_value_now)}</span>
                  <span className="sell-panel-price-unit">total</span>
                </div>
              </>
            )}
            {advice.total_value_predicted && (
              <>
                <div className="sell-panel-price-divider">→</div>
                <div className="sell-panel-price-item">
                  <span className="sell-panel-price-label">Predicted Total</span>
                  <span className="sell-panel-price-value sell-panel-price-value--predicted">{fmt(advice.total_value_predicted)}</span>
                  <span className="sell-panel-price-unit">total</span>
                </div>
              </>
            )}
          </div>

          {/* Confidence bar */}
          <div className="sell-panel-confidence">
            <span className="sell-panel-confidence-label">Confidence</span>
            <div className="sell-panel-confidence-bar">
              <div
                className={`sell-panel-confidence-fill sell-panel-confidence-fill--${advice.signal}`}
                style={{
                  width:
                    advice.signal === "hold" ? "80%" :
                    advice.signal === "sell_urgent" ? "90%" : "65%"
                }}
              />
            </div>
          </div>
        </div>
      )}

      {advice?.no_data && (
        <div className="sell-panel-nodata">
          No price data found for this crop. Try selecting a different crop or mandi.
        </div>
      )}
    </div>
  );
};

export default SellDecisionPanel;
