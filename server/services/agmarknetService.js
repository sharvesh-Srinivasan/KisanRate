const axios = require("axios");

const timestamp = () => new Date().toISOString();
const logError = (message) => {
  process.stderr.write(`[ERROR] ${timestamp()} ${message}\n`);
};

const AGMARKNET_URL =
  "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070";

const parseStates = (raw) =>
  String(raw || "")
    .split(",")
    .map((state) => state.trim())
    .filter(Boolean);

const fetchAgmarknetPrices = async () => {
  try {
    if (!process.env.AGMARKNET_API_KEY) {
      logError("Agmarknet API key missing; skipping fetch");
      return [];
    }

    const states = parseStates(process.env.AGMARKNET_STATES) || [];
    const targetStates = states.length ? states : ["Tamil Nadu"];
    const requests = targetStates.map((state) =>
      axios.get(AGMARKNET_URL, {
        params: {
          "api-key": process.env.AGMARKNET_API_KEY,
          format: "json",
          "filters[state]": state,
          limit: 100
        }
      })
    );

    const responses = await Promise.allSettled(requests);
    const records = responses.flatMap((result) =>
      result.status === "fulfilled" ? result.value?.data?.records || [] : []
    );

    return records.map((record) => ({
      crop: record.commodity || "",
      mandi: record.market || "",
      district: record.district || "",
      state: record.state || "",
      min_price: Number(record.min_price || 0),
      max_price: Number(record.max_price || 0),
      modal_price: Number(record.modal_price || 0),
      date: record.arrival_date || record.price_date || ""
    }));
  } catch (error) {
    logError(`Agmarknet fetch failed: ${error.message}`);
    return [];
  }
};

module.exports = { fetchAgmarknetPrices };
