import { TrendingDown, TrendingUp } from "lucide-react";

// Props: { predicted_price: number | null, current_price: number, predicted_lower?: number | null, predicted_upper?: number | null, loading?: boolean, error?: string | null }
const PredictionBadge = ({
  predicted_price,
  current_price,
  predicted_lower = null,
  predicted_upper = null,
  loading = false,
  error = null
}) => {
  if (loading) {
    return <div className="h-8 bg-border/40 rounded-lg animate-pulse" />;
  }

  if (error) {
    return <div className="text-danger text-sm">{error}</div>;
  }

  if (predicted_price == null) {
    return null;
  }

  const trendUp = predicted_price > current_price;
  const trendDown = predicted_price < current_price;
  const badgeClass = trendUp
    ? "bg-green-50 text-success"
    : "bg-red-50 text-danger";
  const Icon = trendUp ? TrendingUp : TrendingDown;

  if (!trendUp && !trendDown) {
    return (
      <div className="rounded-lg px-3 py-1.5 text-sm font-medium bg-primary-pale text-primary">
        Expected next day: Rs {Number(predicted_price).toLocaleString("en-IN")}
        {predicted_lower != null && predicted_upper != null && (
          <span className="ml-2 text-xs text-text-muted">
            ({Number(predicted_lower).toLocaleString("en-IN")} - {Number(predicted_upper).toLocaleString("en-IN")})
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg px-3 py-1.5 text-sm font-medium inline-flex items-center gap-2 ${badgeClass}`}
    >
      <Icon size={16} />
      Expected next day: Rs {Number(predicted_price).toLocaleString("en-IN")}
      {predicted_lower != null && predicted_upper != null && (
        <span className="text-xs text-text-muted">
          ({Number(predicted_lower).toLocaleString("en-IN")} - {Number(predicted_upper).toLocaleString("en-IN")})
        </span>
      )}
    </div>
  );
};

export default PredictionBadge;
