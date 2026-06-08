// PortfolioCard — displays one crop holding with current value, price movement, and best mandi

const TrendUp = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
);

const TrendDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
    <polyline points="17 18 23 18 23 12"/>
  </svg>
);

const TrendFlat = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const MapPin = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const PortfolioCard = ({ item, onEdit, onDelete }) => {
  const {
    crop_name,
    quantity_quintals,
    current_price,
    total_value,
    harvest_price,
    price_change_pct,
    predicted_price,
    best_mandi,
    harvest_date,
    storage_location
  } = item;

  const pct = price_change_pct ? Number(price_change_pct) : null;
  const isUp = pct !== null && pct > 0;
  const isDown = pct !== null && pct < 0;

  const alertLevel =
    pct !== null && pct >= 10
      ? "high"
      : pct !== null && pct >= 5
      ? "medium"
      : "neutral";

  const formatRs = (n) =>
    n != null
      ? "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })
      : "—";

  return (
    <div className={`portfolio-card portfolio-card--${alertLevel}`}>
      {/* Alert ribbon */}
      {alertLevel !== "neutral" && (
        <div className={`portfolio-card-ribbon portfolio-card-ribbon--${alertLevel}`}>
          {alertLevel === "high" ? "🔥 Great time to sell!" : "📈 Price rising"}
        </div>
      )}

      {/* Header */}
      <div className="portfolio-card-header">
        <div className="portfolio-card-crop-icon">
          {crop_name?.[0]?.toUpperCase() || "C"}
        </div>
        <div className="portfolio-card-title-block">
          <h3 className="portfolio-card-crop-name">{crop_name}</h3>
          <span className="portfolio-card-qty">
            {Number(quantity_quintals).toLocaleString("en-IN")} Quintals
          </span>
        </div>
        <div className="portfolio-card-actions">
          {onEdit && (
            <button className="portfolio-card-action-btn" onClick={() => onEdit(item)} aria-label="Edit">
              ✏️
            </button>
          )}
          {onDelete && (
            <button className="portfolio-card-action-btn portfolio-card-action-btn--del" onClick={() => onDelete(item)} aria-label="Delete">
              🗑️
            </button>
          )}
        </div>
      </div>

      {/* Value */}
      <div className="portfolio-card-value-row">
        <div className="portfolio-card-value">
          <span className="portfolio-card-value-label">Current Value</span>
          <span className="portfolio-card-value-amount">{formatRs(total_value)}</span>
        </div>
        {pct !== null && (
          <div className={`portfolio-card-pct-badge portfolio-card-pct-badge--${isUp ? "up" : isDown ? "down" : "flat"}`}>
            {isUp ? <TrendUp /> : isDown ? <TrendDown /> : <TrendFlat />}
            {isUp ? "+" : ""}{pct}% since harvest
          </div>
        )}
      </div>

      {/* Price details */}
      <div className="portfolio-card-details">
        <div className="portfolio-card-detail">
          <span className="portfolio-card-detail-label">Today's Price</span>
          <span className="portfolio-card-detail-value">{formatRs(current_price)}/Q</span>
        </div>
        {harvest_price && (
          <div className="portfolio-card-detail">
            <span className="portfolio-card-detail-label">Harvest Price</span>
            <span className="portfolio-card-detail-value">{formatRs(harvest_price)}/Q</span>
          </div>
        )}
        {predicted_price && (
          <div className="portfolio-card-detail">
            <span className="portfolio-card-detail-label">ML Prediction</span>
            <span className="portfolio-card-detail-value portfolio-card-detail-value--predicted">
              {formatRs(predicted_price)}/Q
            </span>
          </div>
        )}
      </div>

      {/* Wait Insight Action Block */}
      {item.wait_insight && (
        <div className="portfolio-card-action-block">
          <div className="portfolio-card-action-text">
            <span className="portfolio-card-action-title">
              {item.wait_insight.signal === "wait" ? "Hold Stock" : "Sell Now"}
            </span>
            <span className="portfolio-card-action-desc">{item.wait_insight.reason}</span>
          </div>
          <div className={`portfolio-card-action-badge portfolio-card-action-badge--${item.wait_insight.signal === 'wait' ? 'wait' : item.wait_insight.signal === 'sell_urgent' ? 'urgent' : 'sell'}`}>
            {item.wait_insight.signal === 'wait' ? 'Wait 3 Days' : item.wait_insight.signal === 'sell_urgent' ? 'Urgent' : 'Sell'}
          </div>
        </div>
      )}

      {/* Meta */}
      <div className="portfolio-card-meta">
        {best_mandi && (
          <span className="portfolio-card-meta-pill">
            <MapPin />
            {best_mandi.mandi_name} · {formatRs(best_mandi.modal_price)}/Q
          </span>
        )}
        {harvest_date && (
          <span className="portfolio-card-meta-pill">
            📅 Harvested {new Date(harvest_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </span>
        )}
        {storage_location && (
          <span className="portfolio-card-meta-pill">
            🏚 {storage_location}
          </span>
        )}
      </div>
    </div>
  );
};

export default PortfolioCard;
