import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine
} from "recharts";

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="personal-chart-tooltip">
      <div className="personal-chart-tooltip-date">{formatDate(label)}</div>
      {payload.map((p, i) => (
        <div key={i} className="personal-chart-tooltip-row">
          <span className="personal-chart-tooltip-dot" style={{ background: p.color }} />
          <span>{p.name}: </span>
          <strong>₹{Number(p.value).toLocaleString("en-IN")}</strong>
        </div>
      ))}
    </div>
  );
};

/**
 * PersonalPriceChart
 * Props:
 *   cropName  — string
 *   history   — [{ date, price }]  from sell-advice or portfolio
 *   predicted — number | null
 *   color     — string (hex/hsl) — unique per crop
 */
const PersonalPriceChart = ({ cropName, history = [], predicted, color = "#4ade80" }) => {
  if (!history.length) {
    return (
      <div className="personal-chart-empty">
        No price history available for {cropName}
      </div>
    );
  }

  const data = history.map((h) => ({
    date: h.date || h.price_date,
    price: Number(h.price || h.modal_price)
  }));

  const prices = data.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const pctChange =
    data.length >= 2
      ? (((data[data.length - 1].price - data[0].price) / data[0].price) * 100).toFixed(1)
      : null;

  const isPositive = pctChange !== null && Number(pctChange) >= 0;

  return (
    <div className="personal-chart-card">
      {/* Header */}
      <div className="personal-chart-header">
        <div className="personal-chart-crop-badge" style={{ background: color + "22", color }}>
          {cropName?.[0]}
        </div>
        <div>
          <h4 className="personal-chart-crop-name">{cropName}</h4>
          <p className="personal-chart-subtitle">30-day price history</p>
        </div>
        {pctChange !== null && (
          <div className={`personal-chart-change ${isPositive ? "personal-chart-change--up" : "personal-chart-change--down"}`}>
            {isPositive ? "↑" : "↓"} {Math.abs(pctChange)}%
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="personal-chart-wrap">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[Math.floor(minPrice * 0.97), Math.ceil(maxPrice * 1.03)]}
              tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(1)}k`}
              width={46}
            />
            <Tooltip content={<CustomTooltip />} />
            {predicted && (
              <ReferenceLine
                y={predicted}
                stroke={color}
                strokeDasharray="4 3"
                strokeOpacity={0.7}
                label={{ value: "Pred.", fill: color, fontSize: 10, position: "right" }}
              />
            )}
            <Line
              type="monotone"
              dataKey="price"
              name="Modal Price"
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: color, stroke: "#0d2211", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Min / Max */}
      <div className="personal-chart-stats">
        <span className="personal-chart-stat">
          Low: <strong>₹{Math.round(minPrice).toLocaleString("en-IN")}</strong>
        </span>
        <span className="personal-chart-stat">
          High: <strong>₹{Math.round(maxPrice).toLocaleString("en-IN")}</strong>
        </span>
        {predicted && (
          <span className="personal-chart-stat personal-chart-stat--predicted">
            Predicted: <strong>₹{Math.round(predicted).toLocaleString("en-IN")}</strong>
          </span>
        )}
      </div>
    </div>
  );
};

export default PersonalPriceChart;
