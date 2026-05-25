import { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../components/Navbar";
import StatsBanner from "../components/StatsBanner";
import FilterBar from "../components/FilterBar";
import PriceCard from "../components/PriceCard";
import PriceChart from "../components/PriceChart";
import WhatsAppCTA from "../components/WhatsAppCTA";
import { getPrices, getCrops, getMandis, getPriceHistory } from "../api";
import socket from "../socket";

// Props: { loading?: boolean, error?: string | null }
const Home = ({ loading = false, error = null }) => {
  const [filters, setFilters] = useState({
    state: "Tamil Nadu",
    district: "",
    crop: ""
  });
  const fallbackCrops = [
    "Tomato",
    "Onion",
    "Potato",
    "Rice",
    "Wheat",
    "Cotton",
    "Sugarcane",
    "Maize",
    "Groundnut",
    "Chilli"
  ];
  const tamilNaduDistricts = [
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

  const chartRef = useRef(null);

  const districts = useMemo(() => {
    const filteredMandis = mandis.filter(
      (mandi) => mandi.state === "Tamil Nadu"
    );
    const fromMandis = [...new Set(filteredMandis.map((mandi) => mandi.district))]
      .filter(Boolean)
      .sort();

    if (fromMandis.length) {
      return fromMandis;
    }

    return tamilNaduDistricts;
  }, [mandis, tamilNaduDistricts]);

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

  const fetchPrices = async (silent = false) => {
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
  };

  useEffect(() => {
    fetchBaseData();
  }, []);

  useEffect(() => {
    fetchPrices();
  }, [filters]);

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
  }, [filters]);

  const handleCardClick = async (price) => {
    setSelectedCard(price);
    setLoadingHistory(true);
    setHistoryError("");
    try {
      const response = await getPriceHistory(price.crop_id, price.mandi_id);
      setHistoryData(response.data || []);
      setTimeout(() => {
        chartRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 120);
    } catch (err) {
      setHistoryError("Failed to load chart data.");
    } finally {
      setLoadingHistory(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-cream animate-pulse" />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center text-danger">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-cream min-h-screen">
      <Navbar />
      <div className="pt-16">
        <StatsBanner stats={stats} />
        <FilterBar
          filters={filters}
          districts={districts}
          crops={crops.length ? crops.map((crop) => crop.name) : fallbackCrops}
          onFilterChange={setFilters}
        />

        <section id="prices" className="max-w-6xl mx-auto p-6">
          {errorPrices && (
            <div className="text-danger text-sm mb-4">{errorPrices}</div>
          )}
          {loadingPrices ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="bg-border/40 rounded-xl h-48 animate-pulse"
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

        <section id="about" className="max-w-6xl mx-auto px-6 pb-16">
          <div className="bg-white border border-border rounded-xl p-6 shadow-card">
            <h2 className="font-display text-xl text-text-main mb-2">
              Why KisanRate
            </h2>
            <p className="text-text-muted text-sm leading-relaxed">
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

        <WhatsAppCTA />
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
    </div>
  );
};

export default Home;
