import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../components/Navbar";
import StatsBanner from "../components/StatsBanner";
import FilterBar from "../components/FilterBar";
import PriceCard from "../components/PriceCard";
import PriceChart from "../components/PriceChart";
import WhatsAppCTA from "../components/WhatsAppCTA";
import {
  getPrices,
  getCrops,
  getMandis,
  getPriceHistory,
  predictTodayForState
} from "../api";
import socket from "../socket";

const TAMIL_NADU_DISTRICTS = [
  "Ariyalur",
  "Chengalpattu",
  "Chennai",
  "Coimbatore",
  "Cuddalore",
  "Dharmapuri",
  "Dindigul",
  "Erode",
  "Kallakurichi",
  "Kanchipuram",
  "Kanyakumari",
  "Karur",
  "Krishnagiri",
  "Madurai",
  "Mayiladuthurai",
  "Nagapattinam",
  "Namakkal",
  "Nilgiris",
  "Perambalur",
  "Pudukkottai",
  "Ramanathapuram",
  "Ranipet",
  "Salem",
  "Sivaganga",
  "Tenkasi",
  "Thanjavur",
  "Theni",
  "Thoothukudi",
  "Tiruchirappalli",
  "Tirunelveli",
  "Tirupattur",
  "Tiruppur",
  "Tiruvallur",
  "Tiruvannamalai",
  "Tiruvarur",
  "Vellore",
  "Viluppuram",
  "Virudhunagar"
];

// Props: { loading?: boolean, error?: string | null }
const Home = ({ loading = false, error = null }) => {
  const [filters, setFilters] = useState({
    state: "Tamil Nadu",
    district: "",
    crop: ""
  });
  const [prices, setPrices] = useState([]);
  const [crops, setCrops] = useState([]);
  const [mandis, setMandis] = useState([]);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [errorPrices, setErrorPrices] = useState("");
  const [selectedCard, setSelectedCard] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [toast, setToast] = useState({ show: false, fade: false });
  const [predictionStatus, setPredictionStatus] = useState("");
  const [predictionLoading, setPredictionLoading] = useState(false);

  const whatsappSandboxNumber =
    process.env.REACT_APP_WHATSAPP_SANDBOX_NUMBER || "+14155238886";
  const whatsappJoinCode =
    process.env.REACT_APP_WHATSAPP_JOIN_CODE || "";

  const fallbackCrops = [];

  const chartRef = useRef(null);

  const states = useMemo(() => {
    const fromMandis = [...new Set(mandis.map((mandi) => mandi.state))]
      .filter(Boolean)
      .sort();

    return fromMandis.length ? fromMandis : ["Tamil Nadu"];
  }, [mandis]);

  const districts = useMemo(() => {
    const filteredMandis = mandis.filter(
      (mandi) => mandi.state === filters.state
    );
    const fromMandis = [...new Set(filteredMandis.map((mandi) => mandi.district))]
      .filter(Boolean)
      .sort();

    if (fromMandis.length) {
      return fromMandis;
    }

    return TAMIL_NADU_DISTRICTS;
  }, [mandis, filters.state]);

  const stats = {
    crops: crops.length,
    mandis: mandis.length,
    updatedAt: prices.length ? "Today" : "--"
  };

  const fetchBaseData = async () => {
    try {
      const [cropRes, mandiRes] = await Promise.all([getCrops(), getMandis()]);
      setCrops(cropRes.data || []);
      setMandis(mandiRes.data || []);
    } catch (err) {
      setErrorPrices("Failed to load filters.");
    }
  };

  const fetchPrices = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoadingPrices(true);
      }
      setErrorPrices("");
      try {
        const response = await getPrices(filters);
        setPrices(response.data || []);
      } catch (err) {
        setErrorPrices("Failed to load prices.");
      } finally {
        setLoadingPrices(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    fetchBaseData();
  }, []);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  useEffect(() => {
    socket.on("prices_updated", async () => {
      await fetchPrices(true);
      setToast({ show: true, fade: false });
      setTimeout(() => setToast({ show: true, fade: true }), 2500);
      setTimeout(() => setToast({ show: false, fade: false }), 3000);
    });

    return () => {
      socket.off("prices_updated");
    };
  }, [fetchPrices]);

  const handleCardClick = async (price) => {
    setSelectedCard(price);
    setLoadingHistory(true);
    setHistoryError("");
    try {
      const response = await getPriceHistory(price.crop_id, price.mandi_id);
      setHistoryData(response.data || []);
    } catch (err) {
      setHistoryError("Failed to load chart data.");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedCard(null);
    setHistoryData([]);
    setHistoryError("");
  };

  useEffect(() => {
    if (!selectedCard) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        handleCloseModal();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedCard]);

  const handlePredictToday = async () => {
    if (!filters.state) {
      setPredictionStatus("Select a state to run predictions.");
      return;
    }
    setPredictionStatus("");
    setPredictionLoading(true);
    try {
      const response = await predictTodayForState(filters.state);
      const updated = response?.data?.updated ?? 0;
      setPredictionStatus(`Predictions updated for ${updated} rows.`);
      await fetchPrices(true);
    } catch (err) {
      setPredictionStatus("Failed to run predictions.");
    } finally {
      setPredictionLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen app-shell animate-pulse" />;
  }

  if (error) {
    return (
      <div className="min-h-screen app-shell flex items-center justify-center text-danger">
        {error}
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen">
      <Navbar />
      <div className="pt-20 pb-12">
        <header className="max-w-6xl mx-auto px-6">
          <div className="glass-panel rounded-3xl p-8 md:p-12 relative overflow-hidden">
            <div className="absolute -top-16 -right-10 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-14 -left-12 w-52 h-52 bg-accent/10 rounded-full blur-3xl" />
            <div className="grid gap-10 md:grid-cols-[1.2fr,0.8fr] items-center relative">
              <div>
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Tamil Nadu mandi intelligence
                </span>
                <h1 className="font-display text-3xl md:text-4xl lg:text-5xl text-text-main mt-4">
                  Smarter mandi prices with live updates and next-day insights.
                </h1>
                <p className="text-text-muted text-base md:text-lg mt-4 leading-relaxed">
                  Track crop prices across Tamil Nadu, compare min/max trends, and
                  get AI-led predictions in a calm, farmer-friendly dashboard.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <a
                    className="bg-primary text-white px-6 py-3 rounded-xl font-semibold shadow-card hover:bg-primary-light transition"
                    href="#prices"
                  >
                    Explore prices
                  </a>
                  <a
                    className="border border-border bg-white/70 px-6 py-3 rounded-xl text-text-main font-semibold hover:bg-white transition"
                    href="#about"
                  >
                    Why KisanRate
                  </a>
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-text-muted">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-success rounded-full" />
                    Live updates
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-accent rounded-full" />
                    WhatsApp alerts
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-primary rounded-full" />
                    AI price signals
                  </div>
                </div>
              </div>

              <div className="hero-illustration rounded-2xl border border-border/70 shadow-card p-6 text-text-main">
                <div className="bg-white/85 rounded-xl p-5 shadow-card">
                  <div className="text-xs uppercase tracking-[0.2em] text-text-muted">
                    Today snapshot
                  </div>
                  <div className="mt-3 text-2xl font-display text-primary">
                    Rs 2,450
                  </div>
                  <div className="text-sm text-text-muted">
                    Tomato · Chennai Koyambedu
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-accent-light rounded-lg p-3">
                      <div className="text-text-muted text-xs">Min price</div>
                      <div className="font-semibold text-soil">Rs 2,100</div>
                    </div>
                    <div className="bg-accent-light rounded-lg p-3">
                      <div className="text-text-muted text-xs">Max price</div>
                      <div className="font-semibold text-soil">Rs 2,780</div>
                    </div>
                  </div>
                  <div className="mt-4 text-xs text-text-muted">
                    Updated moments ago
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <WhatsAppCTA
          loading={loadingPrices}
          error={errorPrices}
          crops={crops}
          mandis={mandis}
          sandboxNumber={whatsappSandboxNumber}
          joinCode={whatsappJoinCode}
        />

        <section className="max-w-6xl mx-auto px-6 mt-8">
          <div className="glass-panel rounded-2xl">
            <StatsBanner stats={stats} />
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 mt-6">
          <div className="glass-panel rounded-2xl">
            <FilterBar
              filters={filters}
              states={states}
              districts={districts}
              crops={crops.length ? crops.map((crop) => crop.name) : fallbackCrops}
              onFilterChange={setFilters}
            />
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-text-muted">
              Need fresh predictions for your selected state?
            </div>
            <div className="flex items-center gap-3">
              {predictionStatus && (
                <div className="text-xs text-text-muted">{predictionStatus}</div>
              )}
              <button
                type="button"
                onClick={handlePredictToday}
                disabled={predictionLoading}
                className="bg-primary text-white px-5 py-2.5 rounded-xl font-semibold shadow-card hover:bg-primary-light transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {predictionLoading ? "Predicting..." : "Predict today"}
              </button>
            </div>
          </div>
        </section>

        <section id="prices" className="max-w-6xl mx-auto px-6 mt-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-2xl text-text-main">
                Today&apos;s prices
              </h2>
              <p className="text-sm text-text-muted">
                Tap a crop card to see the 30-day trend.
              </p>
            </div>
          </div>
          {errorPrices && (
            <div className="text-danger text-sm mb-4">{errorPrices}</div>
          )}
          {loadingPrices ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="bg-border/40 rounded-2xl h-48 animate-pulse"
                />
              ))}
            </div>
          ) : prices.length === 0 ? (
            <div className="text-center text-text-muted py-20">
              No prices found for selected filters
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {prices.map((price) => (
                <PriceCard
                  key={price.id}
                  crop={price.crop_name}
                  mandi={price.mandi_name}
                  district={price.district}
                  modal_price={price.modal_price}
                  min_price={price.min_price}
                  max_price={price.max_price}
                  price_date={price.price_date}
                  predicted_price={price.predicted_price}
                  predicted_lower={price.predicted_lower}
                  predicted_upper={price.predicted_upper}
                  predicted_at={price.predicted_at}
                  onClick={() => handleCardClick(price)}
                />
              ))}
            </div>
          )}
        </section>

        <section id="about" className="max-w-6xl mx-auto px-6 pb-16 mt-12">
          <div className="glass-panel rounded-2xl p-6 md:p-8">
            <h2 className="font-display text-2xl text-text-main mb-2">
              Why KisanRate
            </h2>
            <p className="text-text-muted text-sm md:text-base leading-relaxed">
              KisanRate brings live mandi prices and short-term forecasts to
              farmers without requiring any app downloads. It combines official
              Agmarknet data, real-time updates, and WhatsApp alerts so local
              communities can plan sales with confidence.
            </p>
          </div>
        </section>

        <section
          ref={chartRef}
          className={`max-w-6xl mx-auto px-6 pb-12 transition-all duration-300 ${{
            true: "opacity-100 translate-y-0",
            false: "opacity-0 translate-y-6"
          }[Boolean(selectedCard)]}`}
        >
          {selectedCard && (
            <PriceChart
              data={historyData}
              cropName={selectedCard.crop_name}
              mandiName={selectedCard.mandi_name}
              loading={loadingHistory}
              error={historyError}
            />
          )}
        </section>

      </div>

      {toast.show && (
        <div
          className={`fixed top-20 right-6 bg-primary text-white px-4 py-2 rounded-lg shadow-lg transition-opacity duration-300 ${
            toast.fade ? "opacity-0" : "opacity-100"
          }`}
        >
          Prices just updated!
        </div>
      )}

      {selectedCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white/95 border border-border/70 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/70">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-text-muted">
                  {selectedCard.mandi_name} · {selectedCard.district}
                </div>
                <h3 className="font-display text-2xl text-text-main mt-1">
                  {selectedCard.crop_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-text-muted hover:text-text-main transition"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-6 grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
              <div>
                <PriceChart
                  data={historyData}
                  cropName={selectedCard.crop_name}
                  mandiName={selectedCard.mandi_name}
                  loading={loadingHistory}
                  error={historyError}
                />
              </div>
              <div className="space-y-4">
                <div className="bg-primary-pale border border-border/60 rounded-2xl p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-text-muted">
                    Today&apos;s modal price
                  </div>
                  <div className="text-3xl font-display text-primary mt-2">
                    Rs {Number(selectedCard.modal_price).toLocaleString("en-IN")}
                  </div>
                  <div className="text-sm text-text-muted">Per quintal</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white border border-border/70 rounded-2xl p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-text-muted">
                      Minimum
                    </div>
                    <div className="text-lg font-semibold text-soil mt-2">
                      Rs {Number(selectedCard.min_price).toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div className="bg-white border border-border/70 rounded-2xl p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-text-muted">
                      Maximum
                    </div>
                    <div className="text-lg font-semibold text-soil mt-2">
                      Rs {Number(selectedCard.max_price).toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-border/70 rounded-2xl p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-text-muted">
                    Prediction
                  </div>
                  {selectedCard.predicted_price != null ? (
                    <div className="text-sm text-text-main mt-2">
                      Next day estimate: Rs {Number(selectedCard.predicted_price).toLocaleString("en-IN")}
                      {selectedCard.predicted_lower != null &&
                        selectedCard.predicted_upper != null && (
                          <span className="text-text-muted">
                            {" "}({Number(selectedCard.predicted_lower).toLocaleString("en-IN")} - {Number(selectedCard.predicted_upper).toLocaleString("en-IN")})
                          </span>
                        )}
                    </div>
                  ) : (
                    <div className="text-sm text-text-muted mt-2">
                      No prediction available yet.
                    </div>
                  )}
                  <div className="text-xs text-text-muted mt-2">
                    Last updated: {selectedCard.price_date}
                  </div>
                </div>
                <div className="bg-white border border-border/70 rounded-2xl p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-text-muted">
                    Market details
                  </div>
                  <div className="text-sm text-text-main mt-2">
                    {selectedCard.mandi_name}, {selectedCard.district}, {selectedCard.state}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
