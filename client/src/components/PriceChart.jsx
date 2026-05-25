import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

// Props: { data: { price_date: string, modal_price: number }[], cropName: string, mandiName: string, loading?: boolean, error?: string | null }
const PriceChart = ({
  data,
  cropName,
  mandiName,
  loading = false,
  error = null
}) => {
  if (loading) {
    return (
      <div className="bg-white border border-border rounded-xl p-6 shadow-card h-80 animate-pulse" />
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-border rounded-xl p-6 shadow-card text-danger text-sm">
        {error}
      </div>
    );
  }

  const formatted = data.map((entry) => ({
    ...entry,
    modal_price: Number(entry.modal_price)
  }));

  return (
    <div className="bg-white border border-border rounded-xl p-6 shadow-card">
      <div className="font-display text-lg text-text-main mb-2">
        {cropName} at {mandiName} — last 30 days
      </div>
      <div className="text-xs text-text-muted mb-3">Green line = actual price</div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" stroke="#D4C4AE" />
          <XAxis
            dataKey="price_date"
            tickFormatter={(value) =>
              new Date(value).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short"
              })
            }
            tick={{ fill: "#7A6652", fontSize: 12 }}
          />
          <YAxis
            tickFormatter={(value) => `Rs ${Number(value).toLocaleString("en-IN")}`}
            tick={{ fill: "#7A6652", fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="modal_price"
            stroke="#3B6E2F"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Props: { active?: boolean, payload?: Array, label?: string }
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const value = payload[0].value;
  return (
    <div className="bg-white border border-border rounded-lg px-3 py-2 text-xs text-text-main">
      <div>{new Date(label).toLocaleDateString("en-IN")}</div>
      <div>Rs {Number(value).toLocaleString("en-IN")}/Quintal</div>
    </div>
  );
};

export default PriceChart;
