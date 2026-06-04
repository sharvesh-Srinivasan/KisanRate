import { useEffect, useMemo, useState } from "react";
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
  clearStalePredictions
} from "../api";
import { Trash2 } from "lucide-react";
import AnalyticsTab from "../components/AnalyticsTab";

// Props: { loading?: boolean, error?: string | null }
const Admin = ({ loading = false, error = null }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("prices");
  const [prices, setPrices] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [loadingState, setLoadingState] = useState(false);
  const [tabError, setTabError] = useState("");
  const [logPage, setLogPage] = useState(1);

  const [manualForm, setManualForm] = useState({
    crop_id: "",
    mandi_id: "",
    min_price: "",
    max_price: "",
    modal_price: "",
    price_date: ""
  });

  useEffect(() => {
    const token = localStorage.getItem("kisanrate_token");
    if (!token) {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    const loadTab = async () => {
      setLoadingState(true);
      setTabError("");
      try {
        if (activeTab === "prices") {
          const response = await getPrices({});
          setPrices(response.data || []);
        }
        if (activeTab === "farmers") {
          const response = await getAdminFarmers();
          setFarmers(response.data || []);
        }
        if (activeTab === "logs") {
          const response = await getWhatsappLogs();
          setLogs(response.data || []);
        }
      } catch (err) {
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
          item.id === farmer.id
            ? { ...item, subscribed: !item.subscribed }
            : item
        )
      );
    } catch (err) {
      setStatusMessage("Failed to update farmer.");
    }
  };

  const handleDeleteFarmer = async (farmerId) => {
    const confirmed = window.confirm("Delete this farmer?");
    if (!confirmed) return;
    try {
      await deleteFarmer(farmerId);
      setFarmers((prev) => prev.filter((item) => item.id !== farmerId));
    } catch (err) {
      setStatusMessage("Failed to delete farmer.");
    }
  };

  const handleManualSubmit = async (event) => {
    event.preventDefault();
    setStatusMessage("");
    try {
      await manualPriceAdd(manualForm);
      setStatusMessage("Manual price saved.");
    } catch (err) {
      setStatusMessage("Failed to save manual price.");
    }
  };

  const handleTriggerAlert = async () => {
    setStatusMessage("");
    try {
      await triggerTestAlert();
      setStatusMessage("Test alerts sent.");
    } catch (err) {
      setStatusMessage("Failed to send test alerts.");
    }
  };

  const handleFetchPricesNow = async () => {
    setStatusMessage("");
    try {
      await manualPriceAdd({ trigger_fetch: true });
      setStatusMessage("Price fetch triggered.");
    } catch (err) {
      setStatusMessage("Failed to trigger price fetch.");
    }
  };

  const handleRefreshPredictions = async () => {
    setStatusMessage("");
    try {
      const response = await refreshPredictions();
      const updated = response?.data?.updated ?? 0;
      setStatusMessage(`Predictions refreshed for ${updated} rows.`);
    } catch (err) {
      setStatusMessage("Failed to refresh predictions.");
    }
  };

  const handleClearStalePredictions = async () => {
    const confirmed = window.confirm(
      "This will clear all zero/stale predictions from the DB so they can be re-calculated. Continue?"
    );
    if (!confirmed) return;
    setStatusMessage("");
    try {
      const response = await clearStalePredictions();
      const cleared = response?.data?.cleared ?? 0;
      setStatusMessage(`Cleared ${cleared} stale prediction rows. Now click Refresh predictions.`);
    } catch (err) {
      setStatusMessage("Failed to clear stale predictions.");
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-cream animate-pulse" />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center text-danger">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex">
      <aside className="w-60 bg-soil text-white p-6 flex flex-col gap-6">
        <div className="font-display text-lg">KisanRate</div>
        <nav className="flex flex-col gap-2 text-sm font-medium">
          <button
            type="button"
            className={`text-left px-3 py-2 rounded-lg ${activeTab === "prices" ? "bg-primary" : "hover:bg-primary/20"
              }`}
            onClick={() => setActiveTab("prices")}
          >
            Prices
          </button>
          <button
            type="button"
            className={`text-left px-3 py-2 rounded-lg ${activeTab === "analytics" ? "bg-primary" : "hover:bg-primary/20"
              }`}
            onClick={() => setActiveTab("analytics")}
          >
            Analytics
          </button>
          <button
            type="button"
            className={`text-left px-3 py-2 rounded-lg ${activeTab === "farmers" ? "bg-primary" : "hover:bg-primary/20"
              }`}
            onClick={() => setActiveTab("farmers")}
          >
            Farmers
          </button>
          <button
            type="button"
            className={`text-left px-3 py-2 rounded-lg ${activeTab === "logs" ? "bg-primary" : "hover:bg-primary/20"
              }`}
            onClick={() => setActiveTab("logs")}
          >
            WhatsApp Logs
          </button>
          <button
            type="button"
            className={`text-left px-3 py-2 rounded-lg ${activeTab === "alerts" ? "bg-primary" : "hover:bg-primary/20"
              }`}
            onClick={() => setActiveTab("alerts")}
          >
            Alerts
          </button>
        </nav>
      </aside>

      <main className="flex-1 bg-cream overflow-y-auto p-8">
        {loadingState && (
          <div className="text-text-muted text-sm">Loading...</div>
        )}
        {tabError && <div className="text-danger text-sm">{tabError}</div>}

        {activeTab === "analytics" && <AnalyticsTab />}

        {activeTab === "prices" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl text-text-main">
                Today&apos;s Prices
              </h2>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleFetchPricesNow}
                  className="bg-primary text-white rounded-lg px-5 py-2.5 hover:bg-primary-light transition-colors duration-200"
                >
                  Fetch prices now
                </button>
                <button
                  type="button"
                  onClick={handleClearStalePredictions}
                  className="bg-amber-500 text-white rounded-lg px-5 py-2.5 hover:bg-amber-600 transition-colors duration-200"
                  title="Clear zero predictions written by the old buggy code"
                >
                  Clear stale predictions
                </button>
                <button
                  type="button"
                  onClick={handleRefreshPredictions}
                  className="border border-primary text-primary rounded-lg px-5 py-2.5 hover:bg-primary-pale transition-colors duration-200"
                >
                  Refresh predictions
                </button>
              </div>
            </div>

            <div className="bg-white border border-border rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-primary-pale text-text-muted text-xs uppercase tracking-widest">
                  <tr>
                    <th className="py-3 px-4">Crop</th>
                    <th className="py-3 px-4">Mandi</th>
                    <th className="py-3 px-4">Modal price</th>
                    <th className="py-3 px-4">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {prices.map((price) => (
                    <tr
                      key={price.id}
                      className="border-t border-border hover:bg-cream"
                    >
                      <td className="py-3 px-4">{price.crop_name}</td>
                      <td className="py-3 px-4">{price.mandi_name}</td>
                      <td className="py-3 px-4">
                        Rs {Number(price.modal_price).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4">{price.price_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-white border border-border rounded-xl p-6">
              <h3 className="font-display text-lg text-text-main mb-4">
                Add manual price entry
              </h3>
              <form className="grid md:grid-cols-3 gap-4" onSubmit={handleManualSubmit}>
                {Object.entries(manualForm).map(([key, value]) => (
                  <input
                    key={key}
                    value={value}
                    onChange={(event) =>
                      setManualForm((prev) => ({
                        ...prev,
                        [key]: event.target.value
                      }))
                    }
                    className="border border-border rounded-lg px-4 py-2.5 bg-white focus:ring-2 focus:ring-primary/30 focus:outline-none"
                    placeholder={key.replace("_", " ")}
                  />
                ))}
                <button
                  type="submit"
                  className="bg-primary text-white rounded-lg px-5 py-2.5 hover:bg-primary-light transition-colors duration-200"
                >
                  Save price
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === "farmers" && (
          <div className="space-y-6">
            <h2 className="font-display text-xl text-text-main">Farmers</h2>
            <div className="bg-white border border-border rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-primary-pale text-text-muted text-xs uppercase tracking-widest">
                  <tr>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Crop</th>
                    <th className="py-3 px-4">Mandi</th>
                    <th className="py-3 px-4">Subscribed</th>
                    <th className="py-3 px-4">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {farmers.map((farmer) => (
                    <tr
                      key={farmer.id}
                      className="border-t border-border hover:bg-cream"
                    >
                      <td className="py-3 px-4">{farmer.phone}</td>
                      <td className="py-3 px-4">{farmer.name || "-"}</td>
                      <td className="py-3 px-4">{farmer.crop_name || "-"}</td>
                      <td className="py-3 px-4">{farmer.mandi_name || "-"}</td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleSubscribe(farmer)}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${farmer.subscribed
                              ? "bg-green-100 text-success"
                              : "bg-border text-text-muted"
                            }`}
                        >
                          {farmer.subscribed ? "Subscribed" : "Paused"}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleDeleteFarmer(farmer.id)}
                          className="text-danger"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "logs" && (
          <div className="space-y-6">
            <h2 className="font-display text-xl text-text-main">WhatsApp Logs</h2>
            <div className="bg-white border border-border rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-primary-pale text-text-muted text-xs uppercase tracking-widest">
                  <tr>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Incoming</th>
                    <th className="py-3 px-4">Outgoing</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.map((log, index) => (
                    <tr
                      key={`${log.phone}-${index}`}
                      className="border-t border-border hover:bg-cream"
                    >
                      <td className="py-3 px-4">{log.phone}</td>
                      <td className="py-3 px-4">{log.incoming_message}</td>
                      <td className="py-3 px-4">{log.outgoing_message}</td>
                      <td className="py-3 px-4">{log.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <button
                type="button"
                onClick={() => setLogPage((prev) => Math.max(1, prev - 1))}
                className="px-3 py-1 rounded-lg border border-border"
              >
                Prev
              </button>
              <div>Page {logPage}</div>
              <button
                type="button"
                onClick={() => setLogPage((prev) => prev + 1)}
                className="px-3 py-1 rounded-lg border border-border"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {activeTab === "alerts" && (
          <div className="space-y-4">
            <h2 className="font-display text-xl text-text-main">Alerts</h2>
            <button
              type="button"
              onClick={handleTriggerAlert}
              className="bg-primary text-white rounded-lg px-5 py-2.5 hover:bg-primary-light transition-colors duration-200"
            >
              Send test alert to all subscribers
            </button>
            {statusMessage && (
              <div className="text-text-muted text-sm">{statusMessage}</div>
            )}
          </div>
        )}

        {statusMessage && activeTab !== "alerts" && (
          <div className="text-text-muted text-sm mt-4">{statusMessage}</div>
        )}
      </main>
    </div>
  );
};

export default Admin;
