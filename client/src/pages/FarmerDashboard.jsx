import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getFarmerPortfolio, getPriceHistory } from "../api";
import PortfolioCard from "../components/farmer/PortfolioCard";
import SellDecisionPanel from "../components/farmer/SellDecisionPanel";
import PersonalPriceChart from "../components/farmer/PersonalPriceChart";
import MandiComparisonEngine from "../components/farmer/MandiComparisonEngine";

// ── Chart colors per crop (cycles through palette) ──────────────────────────
const CHART_COLORS = [
  "#4ade80", "#f59e0b", "#60a5fa", "#f472b6",
  "#a78bfa", "#34d399", "#fb923c", "#e879f9"
];

// ── Icons ─────────────────────────────────────────────────────────────────────
const LeafIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
    <path d="M18 40C18 28 12 18 8 12" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M30 40C30 28 36 18 40 12" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

const WarehouseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 20V7L12 2 2 7v13a1 1 0 001 1h18a1 1 0 001-1z"/>
    <path d="M16 20v-8H8v8"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

// ── Main Component ─────────────────────────────────────────────────────────────
const FarmerDashboard = () => {
  const navigate = useNavigate();

  const [farmer, setFarmer] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [histories, setHistories] = useState({}); // crop_id → history array
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard"); // "dashboard" | "advisor" | "charts"

  // Auth guard
  useEffect(() => {
    const token = localStorage.getItem("kisanrate_farmer_token");
    const farmerData = localStorage.getItem("kisanrate_farmer");
    if (!token) {
      navigate("/farmer/login");
      return;
    }
    if (farmerData) {
      try { setFarmer(JSON.parse(farmerData)); } catch {}
    }
  }, [navigate]);

  const loadPortfolio = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getFarmerPortfolio();
      if (res.success) {
        setPortfolio(res.data || []);
      } else {
        setError(res.message || "Failed to load portfolio");
      }
    } catch (err) {
      if (err?.response?.status === 401) {
        navigate("/farmer/login");
        return;
      }
      setError("Could not load portfolio. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadPortfolio();
  }, [loadPortfolio]);

  // Load price history for each unique crop in portfolio
  useEffect(() => {
    if (!portfolio.length) return;
    const seen = new Set();
    portfolio.forEach(async (item) => {
      const key = `${item.crop_id}-${item.best_mandi?.mandi_id}`;
      if (seen.has(key) || !item.best_mandi) return;
      seen.add(key);
      try {
        const res = await getPriceHistory(item.crop_id, item.best_mandi.mandi_id);
        if (res.success) {
          setHistories((h) => ({ ...h, [item.crop_id]: res.data }));
        }
      } catch {}
    });
  }, [portfolio]);

  const handleLogout = () => {
    localStorage.removeItem("kisanrate_farmer_token");
    localStorage.removeItem("kisanrate_farmer");
    navigate("/farmer/login");
  };

  // Compute total portfolio value
  const totalValue = portfolio.reduce((sum, item) => sum + (item.total_value || 0), 0);

  // Find crops with significant price movement since harvest
  const alerts = portfolio.filter(
    (item) => item.price_change_pct !== null && item.price_change_pct >= 5
  );

  const fmt = (n) =>
    n != null ? "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 }) : "—";

  if (loading) {
    return (
      <div className="farmer-dash-shell">
        <div className="farmer-dash-loading">
          <div className="farmer-dash-spinner" />
          <p>Loading your farm data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="farmer-dash-shell">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="farmer-dash-sidebar">
        {/* Brand */}
        <div className="farmer-dash-brand">
          <div className="farmer-dash-brand-icon"><LeafIcon /></div>
          <div>
            <span className="farmer-dash-brand-name">KisanRate</span>
            <span className="farmer-dash-brand-tag">Farmer Portal</span>
          </div>
        </div>

        <div className="farmer-dash-divider" />

        {/* Profile */}
        {farmer && (
          <div className="farmer-dash-profile">
            <div className="farmer-dash-avatar">
              {(farmer.name || farmer.phone || "F")[0].toUpperCase()}
            </div>
            <div>
              <div className="farmer-dash-profile-name">
                {farmer.name || "Farmer"}
              </div>
              <div className="farmer-dash-profile-phone">
                +91 {farmer.phone}
              </div>
              {farmer.district && (
                <div className="farmer-dash-profile-district">
                  📍 {farmer.district}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="farmer-dash-divider" />

        {/* Nav */}
        <nav className="farmer-dash-nav">
          {[
            { key: "dashboard", label: "Dashboard", icon: "📊" },
            { key: "advisor", label: "Sell Advisor", icon: "💡" },
            { key: "mandi-compare", label: "Compare Mandis", icon: "⚖️" },
            { key: "charts", label: "Price Charts", icon: "📈" }
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              className={`farmer-dash-nav-item ${activeTab === key ? "farmer-dash-nav-item--active" : ""}`}
              onClick={() => setActiveTab(key)}
              id={`farmer-nav-${key}`}
            >
              <span>{icon}</span>
              <span>{label}</span>
              {activeTab === key && <span className="farmer-dash-nav-dot" />}
            </button>
          ))}
        </nav>

        <div className="farmer-dash-sidebar-footer">
          <button
            className="farmer-dash-warehouse-btn"
            onClick={() => navigate("/farmer/warehouse")}
            id="farmer-go-warehouse-btn"
          >
            <WarehouseIcon />
            My Warehouse
          </button>
          <button
            className="farmer-dash-logout-btn"
            onClick={handleLogout}
            id="farmer-logout-btn"
          >
            <LogoutIcon />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="farmer-dash-main">

        {/* ── Tab: Dashboard ─────────────────────────────────────────── */}
        {activeTab === "dashboard" && (
          <>
            {/* Summary stats */}
            <div className="farmer-dash-stats-row">
              <div className="farmer-dash-stat-card">
                <span className="farmer-dash-stat-icon">🌾</span>
                <div>
                  <div className="farmer-dash-stat-label">Total Holdings</div>
                  <div className="farmer-dash-stat-value">{portfolio.length} Crops</div>
                </div>
              </div>
              <div className="farmer-dash-stat-card farmer-dash-stat-card--highlight">
                <span className="farmer-dash-stat-icon">💰</span>
                <div>
                  <div className="farmer-dash-stat-label">Portfolio Value</div>
                  <div className="farmer-dash-stat-value">{fmt(totalValue)}</div>
                </div>
              </div>
              <div className="farmer-dash-stat-card">
                <span className="farmer-dash-stat-icon">📍</span>
                <div>
                  <div className="farmer-dash-stat-label">Your District</div>
                  <div className="farmer-dash-stat-value">
                    {farmer?.district || "Not set"}
                  </div>
                </div>
              </div>
            </div>

            {/* Price alerts */}
            {alerts.length > 0 && (
              <div className="farmer-dash-alerts">
                <div className="farmer-dash-alerts-header">
                  🔔 Price Alerts
                </div>
                <div className="farmer-dash-alerts-list">
                  {alerts.map((item) => (
                    <div key={item.id} className="farmer-dash-alert-item">
                      <span className="farmer-dash-alert-crop">{item.crop_name}</span>
                      <span className="farmer-dash-alert-msg">
                        price rose <strong>+{item.price_change_pct}%</strong> since harvest
                        {item.price_change_pct >= 10 && " — great time to sell!"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Portfolio */}
            <div className="farmer-dash-section">
              <div className="farmer-dash-section-header">
                <h2 className="farmer-dash-section-title">My Crop Holdings</h2>
                <button
                  className="farmer-dash-add-btn"
                  onClick={() => navigate("/farmer/warehouse")}
                  id="farmer-add-stock-btn"
                >
                  + Add Stock
                </button>
              </div>

              {error && <div className="farmer-dash-error">{error}</div>}

              {portfolio.length === 0 ? (
                <div className="farmer-dash-empty">
                  <div className="farmer-dash-empty-icon">🌾</div>
                  <h3>No crops in your warehouse yet</h3>
                  <p>Add the crops you're currently holding to see their live market value</p>
                  <button
                    className="farmer-dash-empty-btn"
                    onClick={() => navigate("/farmer/warehouse")}
                  >
                    Add Your First Crop
                  </button>
                </div>
              ) : (
                <div className="farmer-dash-portfolio-grid">
                  {portfolio.map((item) => (
                    <PortfolioCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Tab: Sell Advisor ──────────────────────────────────────── */}
        {activeTab === "advisor" && (
          <div className="farmer-dash-section">
            <h2 className="farmer-dash-section-title">Sell Decision Assistant</h2>
            <p className="farmer-dash-section-subtitle">
              Enter your crop details and we'll tell you the optimal time to sell using real-time prices and ML predictions.
            </p>
            <SellDecisionPanel />
          </div>
        )}

        {/* ── Tab: Charts ────────────────────────────────────────────── */}
        {activeTab === "charts" && (
          <div className="farmer-dash-section">
            <h2 className="farmer-dash-section-title">Personal Price History</h2>
            <p className="farmer-dash-section-subtitle">
              30-day price charts for the crops you hold — no clutter from unrelated crops.
            </p>

            {portfolio.length === 0 ? (
              <div className="farmer-dash-empty">
                <div className="farmer-dash-empty-icon">📈</div>
                <h3>No crops tracked yet</h3>
                <p>Add crops to your warehouse to see their personalised price charts</p>
              </div>
            ) : (
              <div className="farmer-dash-charts-grid">
                {portfolio.map((item, idx) => (
                  <PersonalPriceChart
                    key={item.id}
                    cropName={item.crop_name}
                    history={histories[item.crop_id] || []}
                    predicted={item.predicted_price}
                    color={CHART_COLORS[idx % CHART_COLORS.length]}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Mandi Compare ────────────────────────────────────────────── */}
        {activeTab === "mandi-compare" && (
          <div className="farmer-dash-section">
            <MandiComparisonEngine 
              farmerLocation={{
                district: farmer?.district,
                state: farmer?.state
              }} 
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default FarmerDashboard;
