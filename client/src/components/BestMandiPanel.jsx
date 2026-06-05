import { useLang } from "../i18n";

// Props: { cropName: string, prices: Array<{ modal_price, mandi_name, district, mandi_id }> }
// prices = all price rows for the selected crop (already fetched from /api/prices?crop=X)
const BestMandiPanel = ({ cropName, prices = [] }) => {
  const { t } = useLang();

  if (!cropName) {
    return (
      <div className="glass-panel rounded-2xl p-6 text-center text-text-muted text-sm">
        {t("select_crop_hint")}
      </div>
    );
  }

  if (!prices.length) {
    return (
      <div className="glass-panel rounded-2xl p-6 text-center text-text-muted text-sm">
        {t("no_mandi_data")}
      </div>
    );
  }

  // Sort by modal_price descending
  const sorted = [...prices]
    .filter((p) => Number(p.modal_price) > 0)
    .sort((a, b) => Number(b.modal_price) - Number(a.modal_price));

  if (!sorted.length) {
    return (
      <div className="glass-panel rounded-2xl p-6 text-center text-text-muted text-sm">
        {t("no_mandi_data")}
      </div>
    );
  }

  const topPrice = Number(sorted[0].modal_price);
  const secondPrice = sorted[1] ? Number(sorted[1].modal_price) : null;
  const priceDiff = secondPrice ? topPrice - secondPrice : null;

  return (
    <div className="glass-panel rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 px-6 py-4 border-b border-border/60">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-text-muted font-semibold">
              {t("best_mandi_title")} {cropName}
            </div>
            <div className="text-sm text-text-muted mt-0.5">{t("best_mandi_sub")}</div>
          </div>
          <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-semibold text-primary">Live</span>
          </div>
        </div>
      </div>

      {/* Top winner card */}
      <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-white border-b border-emerald-100">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🏆</span>
              <div>
                <div className="font-bold text-text-main text-lg">{sorted[0].mandi_name}</div>
                <div className="text-sm text-text-muted">{sorted[0].district}</div>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-emerald-600 tabular-nums">
              ₹{Number(sorted[0].modal_price).toLocaleString("en-IN")}
            </div>
            <div className="text-xs text-text-muted">{t("per_quintal").replace("/", "")}</div>
            {priceDiff && priceDiff > 0 && (
              <div className="text-xs font-semibold text-emerald-600 mt-0.5">
                +₹{priceDiff.toLocaleString("en-IN")} {t("vs_others")}
              </div>
            )}
          </div>
          <span className="text-xs font-bold bg-emerald-500 text-white px-2.5 py-1 rounded-full">
            {t("best_price")}
          </span>
        </div>
      </div>

      {/* Ranked list */}
      <div className="divide-y divide-border/40">
        {sorted.slice(1, 8).map((price, index) => {
          const pct = topPrice > 0 ? (Number(price.modal_price) / topPrice) * 100 : 0;
          return (
            <div key={`${price.mandi_id}-${index}`} className="px-6 py-3 flex items-center gap-4 hover:bg-accent-light/30 transition">
              <div className="text-sm font-bold text-text-muted w-5 text-center">{index + 2}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-text-main text-sm truncate">{price.mandi_name}</div>
                <div className="text-xs text-text-muted truncate">{price.district}</div>
                {/* Price bar */}
                <div className="mt-1.5 h-1 bg-border/40 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/50 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <div className="text-sm font-bold text-text-main tabular-nums shrink-0">
                ₹{Number(price.modal_price).toLocaleString("en-IN")}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BestMandiPanel;
