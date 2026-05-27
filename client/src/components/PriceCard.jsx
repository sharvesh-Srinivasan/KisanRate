import { Clock } from "lucide-react";
import PredictionBadge from "./PredictionBadge";

// Props: { crop: string, mandi: string, district: string, modal_price: number, min_price: number, max_price: number, price_date: string, predicted_price: number | null, predicted_lower?: number | null, predicted_upper?: number | null, predicted_at?: string | null, onClick: () => void, loading?: boolean, error?: string | null }
const PriceCard = ({
  crop,
  mandi,
  district,
  modal_price,
  min_price,
  max_price,
  predicted_price,
  predicted_lower,
  predicted_upper,
  predicted_at,
  onClick,
  loading = false,
  error = null
}) => {
  if (loading) {
    return (
      <div className="bg-white border border-border rounded-xl p-6 shadow-card h-48 animate-pulse" />
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-border rounded-xl p-6 shadow-card text-danger text-sm">
        {error}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white/90 border border-border/70 rounded-2xl p-6 shadow-card text-left cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <div className="font-display text-xl text-text-main">{crop}</div>
      <div className="text-sm text-text-muted">
        {mandi} · {district}
      </div>

      <div className="mt-4">
        <div className="text-3xl font-bold text-primary font-sans tabular-nums">
          Rs {Number(modal_price).toLocaleString("en-IN")}
        </div>
        <div className="text-sm text-text-muted">/Quintal</div>
      </div>

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span className="bg-accent-light text-soil text-xs rounded-full px-2.5 py-1">
          Min Rs {Number(min_price).toLocaleString("en-IN")}
        </span>
        <span className="bg-accent-light text-soil text-xs rounded-full px-2.5 py-1">
          Max Rs {Number(max_price).toLocaleString("en-IN")}
        </span>
      </div>

      <div className="border-t border-border mt-4 pt-4">
        <PredictionBadge
          predicted_price={predicted_price}
          current_price={Number(modal_price)}
          predicted_lower={predicted_lower}
          predicted_upper={predicted_upper}
        />
      </div>

      <div className="flex items-center justify-end gap-1 text-xs text-text-muted mt-3">
        <Clock size={14} />
        {predicted_at ? `Predicted ${new Date(predicted_at).toLocaleDateString("en-IN")}` : "Updated today"}
      </div>
    </button>
  );
};

export default PriceCard;
