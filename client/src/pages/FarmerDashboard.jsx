import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getFarmerPortfolio, getPriceHistory, getFarmerSalesHistory } from "../api";
import PortfolioCard from "../components/farmer/PortfolioCard";
import SellCropModal from "../components/farmer/SellCropModal";
import SellDecisionPanel from "../components/farmer/SellDecisionPanel";
import PersonalPriceChart from "../components/farmer/PersonalPriceChart";
import MandiComparisonEngine from "../components/farmer/MandiComparisonEngine";
import ExpenseTracker from "../components/farmer/ExpenseTracker";
import WeatherTimeWidget from "../components/WeatherTimeWidget";

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
  const [salesHistory, setSalesHistory] = useState([]);
  const [histories, setHistories] = useState({}); // crop_id → history array
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard"); // "dashboard" | "advisor" | "charts" | "sales" | "expenses"
  const [expenseCropId, setExpenseCropId] = useState(null);

  // Sell Modal State
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [sellItem, setSellItem] = useState(null);

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

  const loadPortfolioAndSales = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [portRes, salesRes] = await Promise.all([
        getFarmerPortfolio(),
        getFarmerSalesHistory().catch(() => ({ success: false, data: [] }))
      ]);
      
      if (portRes.success) {
        setPortfolio(portRes.data || []);
      } else {
        setError(portRes.message || "Failed to load portfolio");
      }

      if (salesRes.success) {
        setSalesHistory(salesRes.data || []);
      }
    } catch (err) {
      if (err?.response?.status === 401) {
        navigate("/farmer/login");
        return;
      }
      setError("Could not load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadPortfolioAndSales();
  }, [loadPortfolioAndSales]);

  const handleSellClick = (item) => {
    setSellItem(item);
    setSellModalOpen(true);
  };

  const closeSellModal = () => {
    setSellModalOpen(false);
    setSellItem(null);
  };

  const handleSaleConfirmed = () => {
    loadPortfolioAndSales(); // Refresh the portfolio and sales history
  };

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
            { key: "charts", label: "Price Charts", icon: "📈" },
            { key: "sales", label: "Sales & Profit", icon: "💰" },
            { key: "expenses", label: "Expenses", icon: "🧾" }
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
        <div className="flex justify-end mb-4 hidden md:flex">
          <WeatherTimeWidget className="bg-white" />
        </div>

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
                    <PortfolioCard key={item.id} item={item} onSell={handleSellClick} />
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

        {/* ── Tab: Sales & Profit ────────────────────────────────────────────── */}
        {activeTab === "sales" && (
          <div className="farmer-dash-section">
            <h2 className="farmer-dash-section-title">💰 Sales & Profit Report</h2>
            <p className="farmer-dash-section-subtitle">
              See exactly how much profit you made on each sale — Revenue minus your farming costs = Net Profit.
            </p>

            {salesHistory.length === 0 ? (
              <div className="farmer-dash-empty">
                <div className="farmer-dash-empty-icon">🧾</div>
                <h3>No sales recorded yet</h3>
                <p>When you sell crops from your warehouse, the profit metrics will appear here.</p>
              </div>
            ) : (() => {
              // Summary totals
              const totalRevenue = salesHistory.reduce((s, x) => s + (x.total_revenue || 0), 0);
              const salesWithExpenses = salesHistory.filter(x => x.has_expenses);
              const totalCost = salesWithExpenses.reduce((s, x) => s + (x.total_cost || 0), 0);
              const totalNetProfit = salesWithExpenses.reduce((s, x) => s + (x.net_profit || 0), 0);
              const hasAnyExpenses = salesWithExpenses.length > 0;

              return (
                <>
                  {/* ── Summary banner ── */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                    <div style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)", borderRadius: "1rem", padding: "1.25rem", color: "white" }}>
                      <div style={{ fontSize: "0.75rem", opacity: 0.8, textTransform: "uppercase", fontWeight: "700", marginBottom: "0.4rem" }}>Total Revenue</div>
                      <div style={{ fontSize: "1.5rem", fontWeight: "800" }}>₹{totalRevenue.toLocaleString("en-IN")}</div>
                      <div style={{ fontSize: "0.75rem", opacity: 0.7, marginTop: "0.2rem" }}>from {salesHistory.length} sale{salesHistory.length > 1 ? "s" : ""}</div>
                    </div>
                    {hasAnyExpenses ? (
                      <>
                        <div style={{ background: "linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%)", borderRadius: "1rem", padding: "1.25rem", color: "white" }}>
                          <div style={{ fontSize: "0.75rem", opacity: 0.8, textTransform: "uppercase", fontWeight: "700", marginBottom: "0.4rem" }}>Total Cost</div>
                          <div style={{ fontSize: "1.5rem", fontWeight: "800" }}>₹{totalCost.toLocaleString("en-IN")}</div>
                          <div style={{ fontSize: "0.75rem", opacity: 0.7, marginTop: "0.2rem" }}>seed + fertiliser + labour + water</div>
                        </div>
                        <div style={{ background: totalNetProfit >= 0 ? "linear-gradient(135deg, #14532d 0%, #16a34a 100%)" : "linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%)", borderRadius: "1rem", padding: "1.25rem", color: "white" }}>
                          <div style={{ fontSize: "0.75rem", opacity: 0.8, textTransform: "uppercase", fontWeight: "700", marginBottom: "0.4rem" }}>Net Profit</div>
                          <div style={{ fontSize: "1.5rem", fontWeight: "800" }}>{totalNetProfit >= 0 ? "+" : ""}₹{Math.abs(totalNetProfit).toLocaleString("en-IN")}</div>
                          <div style={{ fontSize: "0.75rem", opacity: 0.7, marginTop: "0.2rem" }}>{totalNetProfit >= 0 ? "🎉 Profitable season!" : "⚠️ Loss — review costs"}</div>
                        </div>
                      </>
                    ) : (
                      <div style={{ background: "#f8fafc", border: "2px dashed #cbd5e1", borderRadius: "1rem", padding: "1.25rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gridColumn: "span 2", textAlign: "center" }}>
                        <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🧾</div>
                        <div style={{ fontWeight: "700", color: "#0f172a", marginBottom: "0.25rem" }}>No expenses logged yet</div>
                        <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "0.75rem" }}>Log your farming costs to see Net Profit = Revenue − Cost</div>
                        <button
                          onClick={() => setActiveTab("expenses")}
                          style={{ background: "#16a34a", color: "white", border: "none", borderRadius: "0.5rem", padding: "0.5rem 1rem", fontWeight: "700", cursor: "pointer", fontSize: "0.85rem" }}
                        >
                          + Log Expenses Now
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ── Per-sale cards ── */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {salesHistory.map(sale => {
                      const qty = Number(sale.quantity_quintals);
                      const actual = Number(sale.actual_price);
                      const predicted = Number(sale.predicted_price);
                      const revenue = sale.total_revenue || Math.round(qty * actual);
                      const hasCost = sale.has_expenses;
                      const cost = sale.total_cost;
                      const netProfit = sale.net_profit;
                      const margin = sale.profit_margin_pct;
                      const isProfit = netProfit >= 0;

                      return (
                        <div key={sale.id} style={{
                          background: "white",
                          borderRadius: "1rem",
                          border: "1px solid #e2e8f0",
                          overflow: "hidden",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
                        }}>
                          {/* Header */}
                          <div style={{ padding: "1.25rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #f1f5f9" }}>
                            <div>
                              <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "#0f172a" }}>{sale.crop_name}</div>
                              <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "0.2rem" }}>
                                {qty} Quintals • {new Date(sale.sold_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                {sale.mandi_name && ` • ${sale.mandi_name}`}
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>Sale Price</div>
                              <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "#0f172a" }}>₹{actual.toLocaleString("en-IN")}/Q</div>
                            </div>
                          </div>

                          {/* Profit breakdown */}
                          <div style={{ padding: "1rem 1.5rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.75rem" }}>
                            {/* Revenue */}
                            <div style={{ background: "#f0f9ff", borderRadius: "0.625rem", padding: "0.75rem" }}>
                              <div style={{ fontSize: "0.68rem", color: "#0369a1", textTransform: "uppercase", fontWeight: "700" }}>💵 Revenue</div>
                              <div style={{ fontSize: "1.05rem", fontWeight: "800", color: "#0c4a6e", marginTop: "0.25rem" }}>₹{revenue.toLocaleString("en-IN")}</div>
                              <div style={{ fontSize: "0.7rem", color: "#0369a1" }}>{qty}Q × ₹{actual}/Q</div>
                            </div>

                            {/* Cost */}
                            <div style={{ background: hasCost ? "#fff7ed" : "#f8fafc", borderRadius: "0.625rem", padding: "0.75rem" }}>
                              <div style={{ fontSize: "0.68rem", color: hasCost ? "#c2410c" : "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>🌱 Farming Cost</div>
                              {hasCost ? (
                                <>
                                  <div style={{ fontSize: "1.05rem", fontWeight: "800", color: "#7c2d12", marginTop: "0.25rem" }}>₹{cost.toLocaleString("en-IN")}</div>
                                  <div style={{ fontSize: "0.7rem", color: "#c2410c" }}>₹{sale.cost_per_quintal}/Q × {qty}Q</div>
                                </>
                              ) : (
                                <>
                                  <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "#94a3b8", marginTop: "0.25rem" }}>Not logged</div>
                                  <button onClick={() => { setExpenseCropId(sale.crop_id); setActiveTab("expenses"); }}
                                    style={{ fontSize: "0.7rem", color: "#16a34a", fontWeight: "700", background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline" }}>
                                    Log expenses →
                                  </button>
                                </>
                              )}
                            </div>

                            {/* Net Profit */}
                            <div style={{ background: hasCost ? (isProfit ? "#f0fdf4" : "#fef2f2") : "#f8fafc", borderRadius: "0.625rem", padding: "0.75rem" }}>
                              <div style={{ fontSize: "0.68rem", color: hasCost ? (isProfit ? "#15803d" : "#dc2626") : "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>
                                {hasCost ? (isProfit ? "✅ Net Profit" : "❌ Net Loss") : "📊 Net Profit"}
                              </div>
                              {hasCost ? (
                                <>
                                  <div style={{ fontSize: "1.05rem", fontWeight: "800", color: isProfit ? "#14532d" : "#7f1d1d", marginTop: "0.25rem" }}>
                                    {isProfit ? "+" : ""}₹{netProfit.toLocaleString("en-IN")}
                                  </div>
                                  <div style={{ fontSize: "0.7rem", color: isProfit ? "#15803d" : "#dc2626" }}>
                                    {margin !== null ? `${margin}% margin` : ""}
                                  </div>
                                </>
                              ) : (
                                <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "#94a3b8", marginTop: "0.25rem" }}>Add expenses first</div>
                              )}
                            </div>

                            {/* AI Prediction accuracy */}
                            {predicted > 0 && (() => {
                              const diff = actual - predicted;
                              const accurate = Math.abs(diff) <= predicted * 0.05;
                              return (
                                <div style={{ background: accurate ? "#f0fdf4" : "#f8fafc", borderRadius: "0.625rem", padding: "0.75rem" }}>
                                  <div style={{ fontSize: "0.68rem", color: accurate ? "#15803d" : "#64748b", textTransform: "uppercase", fontWeight: "700" }}>
                                    {accurate ? "🎯 AI Accurate" : "📈 AI vs Actual"}
                                  </div>
                                  <div style={{ fontSize: "1.05rem", fontWeight: "800", color: diff >= 0 ? "#14532d" : "#7f1d1d", marginTop: "0.25rem" }}>
                                    {diff >= 0 ? "+" : ""}₹{Math.round(diff)}/Q
                                  </div>
                                  <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Predicted ₹{predicted}/Q</div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Expense breakdown detail if available */}
                          {hasCost && sale.expense_breakdown && (
                            <div style={{ padding: "0.75rem 1.5rem 1rem", background: "#fafafa", borderTop: "1px solid #f1f5f9" }}>
                              <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: "700", textTransform: "uppercase", marginBottom: "0.5rem" }}>Cost Breakdown</div>
                              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                                {[
                                  { label: "🌱 Seeds", val: sale.expense_breakdown.seed_cost },
                                  { label: "🧪 Fertiliser", val: sale.expense_breakdown.fertiliser_cost },
                                  { label: "👷 Labour", val: sale.expense_breakdown.labour_cost },
                                  { label: "💧 Water", val: sale.expense_breakdown.water_cost },
                                ].filter(x => x.val > 0).map(({ label, val }) => (
                                  <div key={label} style={{ fontSize: "0.78rem", color: "#475569" }}>
                                    <span style={{ fontWeight: "600" }}>{label}</span>: ₹{Number(val).toLocaleString("en-IN")}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* ── Tab: Expenses ────────────────────────────────────────────── */}
        {activeTab === "expenses" && (
          <ExpenseTracker initialCropId={expenseCropId} />
        )}
      </main>

      {/* Sell Modal Wizard */}
      {sellModalOpen && sellItem && (
        <SellCropModal
          item={sellItem}
          farmerProfile={farmer}
          onClose={closeSellModal}
          onSaleConfirmed={handleSaleConfirmed}
        />
      )}
    </div>
  );
};

export default FarmerDashboard;
