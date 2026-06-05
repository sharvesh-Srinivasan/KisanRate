// SellAdvisor — computes and renders a "Sell or Wait?" recommendation
// Props: { modal_price, predicted_price, historyData, lang context via useLang }

import { useLang } from "../i18n";

/**
 * Returns { signal: 'sell' | 'hold' | 'falling', reason: string }
 * based on current price vs 7-day average and ML prediction.
 */
export const computeSellAdvice = (modal_price, predicted_price, historyData = []) => {
  const current = Number(modal_price) || 0;
  const predicted = Number(predicted_price) || 0;

  // Compute 7-day average from history (last 7 entries)
  const recentPrices = historyData
    .slice(-7)
    .map((d) => Number(d.modal_price))
    .filter((p) => p > 0);

  const avg7 = recentPrices.length
    ? recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length
    : current;

  const aboveAvg = current > avg7 * 1.03;   // 3% above average
  const predRise = predicted > current * 1.05; // prediction is 5%+ higher
  const predFall = predicted < current * 0.97; // prediction is 3%+ lower
  const belowAvg = current < avg7 * 0.97;   // 3% below average

  if (belowAvg && predFall) return { signal: "falling" };
  if (aboveAvg && (predFall || !predRise)) return { signal: "sell" };
  if (predRise) return { signal: "hold" };
  // Default: if price is near average and prediction is neutral
  return { signal: "sell" };
};

// Badge shown on price cards (compact)
export const SellAdvisorBadge = ({ modal_price, predicted_price, historyData }) => {
  const { t } = useLang();
  if (!modal_price) return null;

  const { signal } = computeSellAdvice(modal_price, predicted_price, historyData);

  const config = {
    sell:    { label: t("sell_now"),  bg: "bg-emerald-50 border-emerald-200 text-emerald-700" },
    hold:    { label: t("hold"),      bg: "bg-amber-50 border-amber-200 text-amber-700" },
    falling: { label: t("falling"),   bg: "bg-red-50 border-red-200 text-red-700" }
  };

  const { label, bg } = config[signal];

  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${bg}`}>
      {label}
    </span>
  );
};

// Full panel shown inside the price detail modal
const SellAdvisor = ({ modal_price, predicted_price, historyData }) => {
  const { t } = useLang();
  if (!modal_price) return null;

  const { signal } = computeSellAdvice(modal_price, predicted_price, historyData);

  const config = {
    sell: {
      label: t("sell_now"),
      reason: t("sell_advice_reason_up"),
      bg: "bg-emerald-50 border-emerald-200",
      icon: "✅",
      text: "text-emerald-800",
      bar: "bg-emerald-400"
    },
    hold: {
      label: t("hold"),
      reason: t("sell_advice_reason_hold"),
      bg: "bg-amber-50 border-amber-200",
      icon: "⏳",
      text: "text-amber-800",
      bar: "bg-amber-400"
    },
    falling: {
      label: t("falling"),
      reason: t("sell_advice_reason_fall"),
      bg: "bg-red-50 border-red-200",
      icon: "⚠️",
      text: "text-red-800",
      bar: "bg-red-400"
    }
  };

  const { label, reason, bg, icon, text, bar } = config[signal];

  return (
    <div className={`rounded-2xl border p-4 ${bg}`}>
      <div className={`text-xs uppercase tracking-[0.15em] font-semibold mb-2 ${text} opacity-60`}>
        {t("sell_advice_label")}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className={`font-bold text-base ${text}`}>{label}</div>
          <div className={`text-xs mt-0.5 ${text} opacity-70`}>{reason}</div>
        </div>
      </div>
      {/* Visual confidence bar */}
      <div className="mt-3 h-1.5 bg-black/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${bar}`}
          style={{
            width: signal === "sell" ? "80%" : signal === "hold" ? "55%" : "25%"
          }}
        />
      </div>
    </div>
  );
};

export default SellAdvisor;
