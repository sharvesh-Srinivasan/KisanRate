import { Clock } from "lucide-react";
import PredictionBadge from "./PredictionBadge";
import { SellAdvisorBadge } from "./SellAdvisor";
import { useLang } from "../i18n";

// Props: { crop, mandi, district, modal_price, min_price, max_price, price_date,
//          predicted_price, predicted_lower, predicted_upper, predicted_at,
//          historyData, onClick, loading, error }
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
  historyData = [],
  onClick,
  loading = false,
  error = null
}) => {
  const { t } = useLang();

  if (loading) {
    return <div className="bg-white border border-border rounded-xl p-6 shadow-card h-48 animate-pulse" />;
  }

  if (error) {
    return <div className="bg-white border border-border rounded-xl p-6 shadow-card text-danger text-sm">{error}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white/90 border border-border/70 rounded-2xl p-6 shadow-card text-left cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 w-full"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-display text-xl text-text-main leading-tight">{crop}</div>
        {/* Sell advisor badge — top right */}
        <SellAdvisorBadge
          modal_price={modal_price}
          predicted_price={predicted_price}
          historyData={historyData}
        />
      </div>
      <div className="text-sm text-text-muted mt-0.5">
        {mandi} · {district}
      </div>

      <div className="mt-4">
        <div className="text-3xl font-bold text-primary font-sans tabular-nums">
          Rs {Number(modal_price).toLocaleString("en-IN")}
        </div>
        <div className="text-sm text-text-muted">{t("per_quintal")}</div>
      </div>

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span className="bg-accent-light text-soil text-xs rounded-full px-2.5 py-1">
          {t("min")} Rs {Number(min_price).toLocaleString("en-IN")}
        </span>
        <span className="bg-accent-light text-soil text-xs rounded-full px-2.5 py-1">
          {t("max")} Rs {Number(max_price).toLocaleString("en-IN")}
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
        {predicted_at
          ? `${t("predicted")} ${new Date(predicted_at).toLocaleDateString("en-IN")}`
          : t("last_updated_label")}
      </div>
    </button>
  );
};

export default PriceCard;
