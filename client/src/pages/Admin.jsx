import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getPrices,
  getAdminFarmers,
  updateFarmer,
  deleteFarmer,
  getWhatsappLogs,
  triggerTestAlert,
  manualPriceAdd,
  refreshPredictions,
  clearStalePredictions,
  getPriceReports
} from "../api";
import {
  Trash2,
  BarChart3,
  Users,
  MessageSquare,
  Bell,
  IndianRupee,
  Home,
  RefreshCw,
  PlusCircle,
  Zap,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  X
} from "lucide-react";
import AnalyticsTab from "../components/AnalyticsTab";

// ── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ message, type = "success", onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const colours = {
    success: "from-emerald-500 to-green-600",
    error: "from-red-500 to-rose-600",
    info: "from-blue-500 to-indigo-600"
  };

  return (
    <div className="admin-toast" role="alert">
      <div className={`admin-toast-inner bg-gradient-to-r ${colours[type]}`}>
        {type === "success" && <CheckCircle2 size={16} className="shrink-0" />}
        {type === "error" && <AlertCircle size={16} className="shrink-0" />}
        <span className="text-sm font-medium">{message}</span>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

// ── Sidebar nav items ─────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "prices", label: "Prices", icon: IndianRupee },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "farmers", label: "Farmers", icon: Users },
  { id: "logs", label: "WhatsApp Logs", icon: MessageSquare },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "reports", label: "Price Reports", icon: AlertCircle }
];

// ── Admin ────────────────────────────────────────────────────────────────────
const Admin = ({ loading = false, error = null }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("prices");
  const [prices, setPrices] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [reports, setReports] = useState([]);
  const [loadingState, setLoadingState] = useState(false);
  const [tabError, setTabError] = useState("");
  const [logPage, setLogPage] = useState(1);
  const [toast, setToast] = useState(null);
  const [manualForm, setManualForm] = useState({
    crop_id: "",
    mandi_id: "",
    min_price: "",
    max_price: "",
    modal_price: "",
    price_date: ""
  });
  const [actionLoading, setActionLoading] = useState("");

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type, key: Date.now() });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("kisanrate_token");
    if (!token) navigate("/login");
  }, [navigate]);

  useEffect(() => {
    const loadTab = async () => {
      setLoadingState(true);
      setTabError("");
      try {
        if (activeTab === "prices") {
          const res = await getPrices({});
          setPrices(res.data || []);
        }
        if (activeTab === "farmers") {
          const res = await getAdminFarmers();
          setFarmers(res.data || []);
        }
        if (activeTab === "logs") {
          const res = await getWhatsappLogs();
          setLogs(res.data || []);
        }
        if (activeTab === "reports") {
          const res = await getPriceReports();
          setReports(res.data || []);
        }
      } catch {
        setTabError("Failed to load data for this tab.");
      } finally {
        setLoadingState(false);
      }
    };
    loadTab();
  }, [activeTab]);

  const paginatedLogs = useMemo(() => {
    const start = (logPage - 1) * 20;
    return logs.slice(start, start + 20);
  }, [logs, logPage]);

  const handleToggleSubscribe = async (farmer) => {
    try {
      await updateFarmer(farmer.id, { subscribed: !farmer.subscribed });
      setFarmers((prev) =>
        prev.map((item) =>
          item.id === farmer.id ? { ...item, subscribed: !item.subscribed } : item
        )
      );
      showToast(`${farmer.name || farmer.phone} subscription updated.`);
    } catch {
      showToast("Failed to update farmer.", "error");
    }
  };

  const handleDeleteFarmer = async (farmerId) => {
    if (!window.confirm("Delete this farmer? This cannot be undone.")) return;
    try {
      await deleteFarmer(farmerId);
      setFarmers((prev) => prev.filter((item) => item.id !== farmerId));
      showToast("Farmer deleted.");
    } catch {
      showToast("Failed to delete farmer.", "error");
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setActionLoading("manual");
    try {
      await manualPriceAdd(manualForm);
      showToast("Manual price entry saved.");
      setManualForm({ crop_id: "", mandi_id: "", min_price: "", max_price: "", modal_price: "", price_date: "" });
    } catch {
      showToast("Failed to save manual price.", "error");
    } finally {
      setActionLoading("");
    }
  };

  const handleTriggerAlert = async () => {
    setActionLoading("alert");
    try {
      await triggerTestAlert();
      showToast("Test alerts sent to all subscribers.");
    } catch {
      showToast("Failed to send test alerts.", "error");
    } finally {
      setActionLoading("");
    }
  };

  const handleFetchPricesNow = async () => {
    setActionLoading("fetch");
    try {
      await manualPriceAdd({ trigger_fetch: true });
      showToast("Price fetch triggered successfully.");
    } catch {
      showToast("Failed to trigger price fetch.", "error");
    } finally {
      setActionLoading("");
    }
  };

  const handleRefreshPredictions = async () => {
    setActionLoading("refresh");
    try {
      const res = await refreshPredictions();
      showToast(`Predictions refreshed for ${res?.data?.updated ?? 0} rows.`);
    } catch {
      showToast("Failed to refresh predictions.", "error");
    } finally {
      setActionLoading("");
    }
  };

  const handleClearStalePredictions = async () => {
    if (!window.confirm("Clear all zero/stale predictions so they can be re-calculated?")) return;
    setActionLoading("clear");
    try {
      const res = await clearStalePredictions();
      showToast(`Cleared ${res?.data?.cleared ?? 0} stale rows. Now refresh predictions.`, "info");
    } catch {
      showToast("Failed to clear stale predictions.", "error");
    } finally {
      setActionLoading("");
    }
  };

  if (loading) return <div className="min-h-screen admin-shell animate-pulse" />;
  if (error) return (
    <div className="min-h-screen admin-shell flex items-center justify-center">
      <div className="admin-error-card">
        <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
        <p className="text-white/80 text-center">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen admin-shell flex">
      {/* Toast */}
      {toast && (
        <Toast
          key={toast.key}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="admin-sidebar">
        {/* Logo */}
        <div className="admin-sidebar-logo">
          <div className="admin-logo-badge">
            <TrendingUp size={18} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">KisanRate</span>
        </div>

        {/* Back to Home */}
        <button
          type="button"
          onClick={() => navigate("/")}
          className="admin-back-btn"
        >
          <Home size={15} />
          <span>Back to Home</span>
        </button>

        <div className="admin-sidebar-divider" />

        {/* Nav */}
        <nav className="flex flex-col gap-1" aria-label="Admin navigation">
          <p className="admin-nav-label">Navigation</p>
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`admin-nav-item ${activeTab === id ? "admin-nav-item--active" : ""}`}
            >
              <Icon size={16} className="shrink-0" />
              <span>{label}</span>
              {activeTab === id && <div className="admin-nav-active-dot" />}
            </button>
          ))}
        </nav>

        {/* Bottom user card */}
        <div className="admin-sidebar-footer">
          <div className="admin-user-card">
            <div className="admin-user-avatar">A</div>
            <div>
              <div className="text-white text-sm font-semibold">Admin</div>
              <div className="text-white/40 text-xs">Super user</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("kisanrate_token");
              navigate("/login");
            }}
            className="admin-logout-btn"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto admin-main">
        {/* Header bar */}
        <div className="admin-topbar">
          <div>
            <h1 className="admin-page-title">
              {NAV_ITEMS.find((n) => n.id === activeTab)?.label}
            </h1>
            <p className="admin-page-subtitle">
              {activeTab === "prices" && "Manage and monitor crop prices across mandis"}
              {activeTab === "analytics" && "Visual insights and market trends"}
              {activeTab === "farmers" && "Farmer subscriptions and contacts"}
              {activeTab === "logs" && "WhatsApp conversation history"}
              {activeTab === "alerts" && "Send and test notification alerts"}
              {activeTab === "reports" && "Farmer-submitted price corrections"}
            </p>
          </div>
          <div className="text-sm text-white/40">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          {/* Status indicators */}
          {loadingState && (
            <div className="admin-loading-bar">
              <div className="admin-loading-bar-inner" />
            </div>
          )}
          {tabError && (
            <div className="admin-alert admin-alert--error">
              <AlertCircle size={16} />
              {tabError}
            </div>
          )}

          {/* ── Analytics tab ───────────────────────────────── */}
          {activeTab === "analytics" && <AnalyticsTab />}

          {/* ── Prices tab ──────────────────────────────────── */}
          {activeTab === "prices" && (
            <div className="space-y-6">
              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total entries", value: prices.length, colour: "from-emerald-500/20 to-green-600/10", text: "text-emerald-400" },
                  { label: "With predictions", value: prices.filter(p => p.predicted_price != null).length, colour: "from-blue-500/20 to-indigo-600/10", text: "text-blue-400" },
                  { label: "Today's data", value: prices.filter(p => p.price_date === new Date().toISOString().slice(0,10)).length, colour: "from-amber-500/20 to-orange-600/10", text: "text-amber-400" },
                  { label: "Stale predictions", value: prices.filter(p => p.predicted_price === 0).length, colour: "from-red-500/20 to-rose-600/10", text: "text-red-400" }
                ].map((stat) => (
                  <div key={stat.label} className={`admin-stat-card bg-gradient-to-br ${stat.colour}`}>
                    <div className="text-white/50 text-xs uppercase tracking-widest">{stat.label}</div>
                    <div className={`text-3xl font-bold mt-1 ${stat.text}`}>{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleFetchPricesNow}
                  disabled={!!actionLoading}
                  className="admin-btn admin-btn--primary"
                >
                  <RefreshCw size={15} className={actionLoading === "fetch" ? "animate-spin" : ""} />
                  Fetch prices now
                </button>
                <button
                  type="button"
                  onClick={handleClearStalePredictions}
                  disabled={!!actionLoading}
                  className="admin-btn admin-btn--warning"
                >
                  <Zap size={15} className={actionLoading === "clear" ? "animate-spin" : ""} />
                  Clear stale predictions
                </button>
                <button
                  type="button"
                  onClick={handleRefreshPredictions}
                  disabled={!!actionLoading}
                  className="admin-btn admin-btn--outline"
                >
                  <TrendingUp size={15} className={actionLoading === "refresh" ? "animate-spin" : ""} />
                  Refresh predictions
                </button>
              </div>

              {/* Prices table */}
              <div className="admin-table-card">
                <div className="admin-table-header">
                  <span>Today's Prices</span>
                  <span className="admin-table-badge">{prices.length} entries</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Crop</th>
                        <th>Mandi</th>
                        <th>Modal price</th>
                        <th>Predicted</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prices.map((price) => (
                        <tr key={price.id}>
                          <td className="font-medium text-white">{price.crop_name}</td>
                          <td className="text-white/60">{price.mandi_name}</td>
                          <td>
                            <span className="admin-price-chip">
                              ₹{Number(price.modal_price).toLocaleString("en-IN")}
                            </span>
                          </td>
                          <td>
                            {price.predicted_price != null && price.predicted_price > 0 ? (
                              <span className="admin-predicted-chip">
                                ₹{Number(price.predicted_price).toLocaleString("en-IN")}
                              </span>
                            ) : (
                              <span className="text-white/30 text-xs">—</span>
                            )}
                          </td>
                          <td className="text-white/40 text-xs">{price.price_date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Manual price form */}
              <div className="admin-card">
                <div className="admin-card-header">
                  <PlusCircle size={16} className="text-emerald-400" />
                  <span>Add manual price entry</span>
                </div>
                <form className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3" onSubmit={handleManualSubmit}>
                  {Object.entries(manualForm).map(([key, value]) => (
                    <div key={key} className="flex flex-col gap-1">
                      <label className="text-white/40 text-xs uppercase tracking-wider">
                        {key.replace(/_/g, " ")}
                      </label>
                      <input
                        value={value}
                        onChange={(e) => setManualForm((prev) => ({ ...prev, [key]: e.target.value }))}
                        className="admin-input"
                        placeholder={key.replace(/_/g, " ")}
                        type={key.includes("price") ? "number" : key === "price_date" ? "date" : "text"}
                      />
                    </div>
                  ))}
                  <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
                    <button
                      type="submit"
                      disabled={actionLoading === "manual"}
                      className="admin-btn admin-btn--primary"
                    >
                      {actionLoading === "manual" ? "Saving..." : "Save price"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ── Farmers tab ─────────────────────────────────── */}
          {activeTab === "farmers" && (
            <div className="space-y-6">
              <div className="admin-table-card">
                <div className="admin-table-header">
                  <span>Registered Farmers</span>
                  <span className="admin-table-badge">{farmers.length} farmers</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Phone</th>
                        <th>Name</th>
                        <th>Crop</th>
                        <th>Mandi</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {farmers.map((farmer) => (
                        <tr key={farmer.id}>
                          <td className="font-mono text-white/80 text-sm">{farmer.phone}</td>
                          <td className="font-medium text-white">{farmer.name || "—"}</td>
                          <td className="text-white/60">{farmer.crop_name || "—"}</td>
                          <td className="text-white/60">{farmer.mandi_name || "—"}</td>
                          <td>
                            <button
                              type="button"
                              onClick={() => handleToggleSubscribe(farmer)}
                              className={`admin-status-pill ${farmer.subscribed ? "admin-status-pill--active" : "admin-status-pill--paused"}`}
                            >
                              {farmer.subscribed ? "Subscribed" : "Paused"}
                            </button>
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() => handleDeleteFarmer(farmer.id)}
                              className="admin-delete-btn"
                              aria-label="Delete farmer"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── Logs tab ────────────────────────────────────── */}
          {activeTab === "logs" && (
            <div className="space-y-4">
              <div className="admin-table-card">
                <div className="admin-table-header">
                  <span>WhatsApp Conversations</span>
                  <span className="admin-table-badge">{logs.length} total</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Phone</th>
                        <th>Incoming</th>
                        <th>Outgoing</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedLogs.map((log, i) => (
                        <tr key={`${log.phone}-${i}`}>
                          <td className="font-mono text-white/70 text-sm">{log.phone}</td>
                          <td className="text-white/80 max-w-xs truncate">{log.incoming_message}</td>
                          <td className="text-white/60 max-w-xs truncate">{log.outgoing_message}</td>
                          <td className="text-white/40 text-xs whitespace-nowrap">{log.created_at}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* Pagination */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                  disabled={logPage === 1}
                  className="admin-btn admin-btn--outline admin-btn--sm"
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <span className="text-white/40 text-sm">Page {logPage}</span>
                <button
                  type="button"
                  onClick={() => setLogPage((p) => p + 1)}
                  disabled={paginatedLogs.length < 20}
                  className="admin-btn admin-btn--outline admin-btn--sm"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ── Reports tab ──────────────────────────────────── */}
          {activeTab === "reports" && (
            <div className="space-y-4">
              <div className="admin-table-card">
                <div className="admin-table-header">
                  <span>Farmer Price Reports</span>
                  <span className="admin-table-badge">{reports.length} reports</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Crop</th>
                        <th>Mandi</th>
                        <th>Current Price</th>
                        <th>Reported Price</th>
                        <th>Reason</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.length === 0 && (
                        <tr><td colSpan={6} className="text-center text-white/40 py-8">No reports submitted yet.</td></tr>
                      )}
                      {reports.map((report) => (
                        <tr key={report.id}>
                          <td className="font-medium text-white">{report.crop_name}</td>
                          <td className="text-white/60">{report.mandi_name}</td>
                          <td>
                            <span className="admin-price-chip">
                              ₹{Number(report.current_price).toLocaleString("en-IN")}
                            </span>
                          </td>
                          <td>
                            {report.reported_price ? (
                              <span className="admin-predicted-chip">
                                ₹{Number(report.reported_price).toLocaleString("en-IN")}
                              </span>
                            ) : <span className="text-white/30">—</span>}
                          </td>
                          <td className="text-white/60 max-w-xs truncate text-xs">{report.reason || "—"}</td>
                          <td className="text-white/40 text-xs">{new Date(report.created_at).toLocaleDateString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── Alerts tab ──────────────────────────────────── */}
          {activeTab === "alerts" && (
            <div className="space-y-6">
              <div className="admin-card">
                <div className="admin-card-header">
                  <Bell size={16} className="text-amber-400" />
                  <span>Send test alert</span>
                </div>
                <p className="text-white/50 text-sm mt-3 mb-5">
                  This will trigger a WhatsApp alert to all subscribed farmers using the latest available price data.
                </p>
                <button
                  type="button"
                  onClick={handleTriggerAlert}
                  disabled={actionLoading === "alert"}
                  className="admin-btn admin-btn--primary"
                >
                  <Bell size={15} className={actionLoading === "alert" ? "animate-bounce" : ""} />
                  {actionLoading === "alert" ? "Sending..." : "Send test alert to all subscribers"}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Admin;
