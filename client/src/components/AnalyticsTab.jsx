import { useEffect, useState } from "react";
import {
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { getAnalytics } from "../api";

// ── Colour palette ─────────────────────────────────────────────────────────
const GREEN  = "#3B6E2F";
const AMBER  = "#C17F3A";
const TEAL   = "#2A7D6E";
const INDIGO = "#4B5FA6";

// ── Helper: format rupee values on axis ────────────────────────────────────
const rupeeTick = (value) =>
  value >= 1000 ? `₹${(value / 1000).toFixed(1)}k` : `₹${value}`;

// ── Shared tooltip style ───────────────────────────────────────────────────
const tooltipStyle = {
  contentStyle: {
    background: "#fffdf8",
    border: "1px solid #e2d9c8",
    borderRadius: 12,
    fontSize: 12,
    boxShadow: "0 8px 24px rgba(44,31,14,0.10)"
  }
};

// ── Stat card ──────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color = GREEN }) => (
  <div className="bg-white rounded-2xl border border-border p-5 flex flex-col gap-1">
    <span className="text-xs text-text-muted uppercase tracking-widest">{label}</span>
    <span className="text-3xl font-bold" style={{ color }}>{value ?? "—"}</span>
    {sub && <span className="text-xs text-text-muted">{sub}</span>}
  </div>
);

// ── Chart card wrapper ─────────────────────────────────────────────────────
const ChartCard = ({ title, subtitle, children }) => (
  <div className="bg-white rounded-2xl border border-border p-6 flex flex-col gap-4">
    <div>
      <h3 className="font-display text-base text-text-main">{title}</h3>
      {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
);

// ── Main AnalyticsTab component ────────────────────────────────────────────
const AnalyticsTab = () => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getAnalytics();
        setData(res.data);
      } catch {
        setError("Failed to load analytics. Make sure you are logged in.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted text-sm animate-pulse">
        Loading analytics…
      </div>
    );
  }

  if (error) {
    return <div className="text-danger text-sm">{error}</div>;
  }

  const { topCrops, busiestMandis, priceTrend, predictionAccuracy, summary } = data || {};

  // Format dates for X-axis readability
  const formatDate = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    return `${dt.getDate()}/${dt.getMonth() + 1}`;
  };

  const trendData  = (priceTrend || []).map((r) => ({
    date: formatDate(r.price_date),
    "Avg Price": Number(r.avg_price)
  }));

  const accuracyData = (predictionAccuracy || []).map((r) => ({
    date: formatDate(r.price_date),
    Actual: Number(r.actual),
    Predicted: Number(r.predicted)
  }));

  const cropData = (topCrops || []).map((r) => ({
    name: r.crop_name,
    Records: Number(r.record_count)
  }));

  const mandiData = (busiestMandis || []).map((r) => ({
    name: r.mandi_name,
    Records: Number(r.record_count)
  }));

  const accuracy = (() => {
    if (!accuracyData.length) return null;
    const mape = accuracyData.reduce((sum, r) => {
      if (!r.Actual) return sum;
      return sum + Math.abs((r.Actual - r.Predicted) / r.Actual);
    }, 0) / accuracyData.length;
    return `${(100 - mape * 100).toFixed(1)}%`;
  })();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-text-main">Analytics Dashboard</h2>
        <p className="text-sm text-text-muted mt-1">Live insights from your price and ML prediction data</p>
      </div>

      {/* ── Summary KPIs ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Crops" value={summary?.total_crops} sub="tracked crops" color={GREEN} />
        <StatCard label="Total Mandis" value={summary?.total_mandis} sub="markets covered" color={AMBER} />
        <StatCard label="Price Records" value={Number(summary?.total_records || 0).toLocaleString("en-IN")} sub="all-time entries" color={TEAL} />
        <StatCard
          label="ML Accuracy"
          value={accuracy || "N/A"}
          sub={accuracy ? "vs actual prices" : "no prediction data yet"}
          color={INDIGO}
        />
      </div>

      {/* ── Row 1: Price Trend + Prediction Accuracy ─────────────────── */}
      <div className="grid md:grid-cols-2 gap-6">
        <ChartCard
          title="30-Day Price Trend"
          subtitle="Average modal price across all crops & mandis"
        >
          {trendData.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={GREEN} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0e8db" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#b5a08a" />
                <YAxis tickFormatter={rupeeTick} tick={{ fontSize: 11 }} stroke="#b5a08a" width={52} />
                <Tooltip {...tooltipStyle} formatter={(v) => [`₹${v}`, "Avg Price"]} />
                <Area type="monotone" dataKey="Avg Price" stroke={GREEN} strokeWidth={2} fill="url(#greenGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-text-muted text-center py-10">No trend data for the last 30 days.</p>
          )}
        </ChartCard>

        <ChartCard
          title="ML Prediction Accuracy"
          subtitle="Predicted vs actual price — last 30 days"
        >
          {accuracyData.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={accuracyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0e8db" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#b5a08a" />
                <YAxis tickFormatter={rupeeTick} tick={{ fontSize: 11 }} stroke="#b5a08a" width={52} />
                <Tooltip {...tooltipStyle} formatter={(v) => `₹${v}`} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Actual"    stroke={GREEN}  strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Predicted" stroke={AMBER}  strokeWidth={2} dot={false} strokeDasharray="5 4" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-text-muted text-center py-10">No prediction data yet. Run "Refresh Predictions" first.</p>
          )}
        </ChartCard>
      </div>

      {/* ── Row 2: Top Crops + Busiest Mandis ────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-6">
        <ChartCard title="Top 5 Crops by Volume" subtitle="Total price records per crop">
          {cropData.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={cropData} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0e8db" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#b5a08a" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#b5a08a" width={90} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="Records" fill={GREEN} radius={[0, 6, 6, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-text-muted text-center py-10">No crop data available.</p>
          )}
        </ChartCard>

        <ChartCard title="Top 5 Busiest Mandis" subtitle="Markets with most price records">
          {mandiData.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={mandiData} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0e8db" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#b5a08a" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#b5a08a" width={90} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="Records" fill={AMBER} radius={[0, 6, 6, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-text-muted text-center py-10">No mandi data available.</p>
          )}
        </ChartCard>
      </div>
    </div>
  );
};

export default AnalyticsTab;
