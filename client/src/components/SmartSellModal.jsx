import { useState } from "react";
import { useLang } from "../i18n";
import { Calculator, X, TrendingUp, TrendingDown, MessageCircle } from "lucide-react";

// Props: { isOpen, onClose, prices, crops, districts }
const SmartSellModal = ({ isOpen, onClose, prices, crops, districts }) => {
  const { t } = useLang();
  
  const [form, setForm] = useState({
    crop: "",
    district: "",
    quantity: ""
  });
  const [result, setResult] = useState(null);
  const [noData, setNoData] = useState(false);

  if (!isOpen) return null;

  const handleCalculate = () => {
    setNoData(false);
    setResult(null);

    if (!form.crop || !form.district || !form.quantity) return;

    // Filter prices for specific crop (across all of Tamil Nadu)
    const districtPrices = prices.filter(
      p => p.crop_name === form.crop
    );

    if (districtPrices.length === 0) {
      setNoData(true);
      return;
    }

    // Sort to find the mandi with the highest modal_price in the district
    const sorted = [...districtPrices].sort(
      (a, b) => Number(b.modal_price) - Number(a.modal_price)
    );
    const bestMandi = sorted[0];

    const currentPrice = Number(bestMandi.modal_price);
    const predictedPrice = Number(bestMandi.predicted_price || 0);
    const qty = Number(form.quantity);
    
    const revenue = currentPrice * qty;
    
    // AI Advice logic
    let adviceType = "sell";
    if (predictedPrice > currentPrice && predictedPrice > 0) {
      // If prediction is significantly higher (e.g. > 1%), advise to wait
      if ((predictedPrice - currentPrice) / currentPrice > 0.01) {
        adviceType = "wait";
      }
    }

    setResult({
      mandi: bestMandi,
      revenue,
      adviceType
    });
  };

  const shareOnWhatsApp = () => {
    if (!result) return;
    const msg = `🌾 *KisanRate Easy Sell Insight*\n\n` +
      `Crop: ${form.crop}\n` +
      `Best Mandi: ${result.mandi.mandi_name}, ${result.mandi.district}\n` +
      `Price Today: Rs ${Number(result.mandi.modal_price).toLocaleString("en-IN")}/Qtl\n` +
      `Estimated Revenue for ${form.quantity} Qtl: Rs ${result.revenue.toLocaleString("en-IN")}\n\n` +
      `_Powered by KisanRate_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal Card */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up-fade">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 px-6 py-5 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
              <Calculator size={20} />
            </div>
            <div>
              <h2 className="font-display text-xl text-text-main font-semibold">
                {t("smart_sell_title")}
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                {t("smart_sell_sub")}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/50 border border-border/50 flex items-center justify-center text-text-muted hover:bg-white hover:text-text-main transition-all"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            {/* Crop Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Crop
              </label>
              <select 
                className="w-full bg-cream/50 border border-border/80 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.crop}
                onChange={(e) => setForm({...form, crop: e.target.value})}
              >
                <option value="">Select Crop...</option>
                {crops.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* District Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                District
              </label>
              <select 
                className="w-full bg-cream/50 border border-border/80 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.district}
                onChange={(e) => setForm({...form, district: e.target.value})}
              >
                <option value="">Select District...</option>
                {districts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-1.5 mb-6">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              {t("smart_sell_quantity")}
            </label>
            <div className="relative">
              <input 
                type="number" 
                placeholder={t("smart_sell_quantity_ph")}
                className="w-full bg-cream/50 border border-border/80 rounded-xl px-4 py-3 pl-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.quantity}
                onChange={(e) => setForm({...form, quantity: e.target.value})}
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-medium">
                ⚖️
              </span>
            </div>
          </div>

          <button 
            onClick={handleCalculate}
            disabled={!form.crop || !form.district || !form.quantity}
            className="w-full py-3.5 bg-primary text-white font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:transform-none disabled:hover:shadow-none"
          >
            {t("smart_sell_calc_btn")}
          </button>

          {/* Error / No Data */}
          {noData && (
            <div className="mt-5 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm text-center font-medium animate-fade-in">
              {t("smart_sell_no_data")}
            </div>
          )}

          {/* Result Area */}
          {result && (
            <div className="mt-6 pt-6 border-t border-border/50 animate-fade-in">
              <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success"></span>
                {t("smart_sell_best_match")}
              </h3>
              
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 relative overflow-hidden">
                {/* Decorative blob */}
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-primary/10 rounded-full blur-xl pointer-events-none"></div>
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div>
                    <h4 className="font-display text-2xl text-primary font-bold">
                      {result.mandi.mandi_name}
                    </h4>
                    <p className="text-sm text-text-muted">
                      Rs {Number(result.mandi.modal_price).toLocaleString("en-IN")} / Quintal
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-muted uppercase tracking-wider mb-0.5">
                      {t("smart_sell_est_revenue")}
                    </p>
                    <p className="text-xl font-bold text-text-main">
                      Rs {result.revenue.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                {/* AI Advice Box */}
                <div className={`p-3 rounded-xl border flex items-start gap-3 ${
                  result.adviceType === "wait" 
                    ? "bg-amber-50 border-amber-200 text-amber-800" 
                    : "bg-emerald-50 border-emerald-200 text-emerald-800"
                }`}>
                  <div className="mt-0.5">
                    {result.adviceType === "wait" ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  </div>
                  <p className="text-sm font-medium leading-snug">
                    {result.adviceType === "wait" 
                      ? t("smart_sell_advice_wait") 
                      : t("smart_sell_advice_sell")}
                  </p>
                </div>
                
                {/* Share Button */}
                <button 
                  onClick={shareOnWhatsApp}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-[#25D366] text-white font-semibold rounded-xl hover:bg-[#20bd5a] transition-colors"
                >
                  <MessageCircle size={18} />
                  {t("smart_sell_share")}
                </button>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartSellModal;
