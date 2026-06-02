const axios = require("axios");

const timestamp = () => new Date().toISOString();
const logWarn = (message) => {
  process.stderr.write(`[WARN] ${timestamp()} ${message}\n`);
};

const DEFAULT_ML_SERVICE_URL = "https://kisanrate-ml.onrender.com";

const resolveMlServiceUrl = () => {
  const rawUrl = String(process.env.ML_SERVICE_URL || "").trim();
  const candidate = rawUrl || DEFAULT_ML_SERVICE_URL;

  if (/^https?:\/\//i.test(candidate)) {
    return candidate.replace(/\/$/, "");
  }

  return `https://${candidate.replace(/^\/\//, "").replace(/\/$/, "")}`;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getPrediction = async (cropName, mandiName) => {
  try {
    const serviceUrl = resolveMlServiceUrl();
    const makeRequest = () =>
      axios.post(
        `${serviceUrl}/predict`,
        { crop: cropName, mandi: mandiName },
        { timeout: 8000 }
      );

    let response;
    try {
      response = await makeRequest();
    } catch (error) {
      const status = error?.response?.status;
      if (status === 502 || status === 503 || status === 504) {
        await sleep(500);
        response = await makeRequest();
      } else {
        throw error;
      }
    }
    const predicted = response?.data?.predicted_price;
    if (typeof predicted !== "number") {
      return null;
    }
    return {
      predicted_price: predicted,
      predicted_lower:
        typeof response?.data?.predicted_lower === "number"
          ? response.data.predicted_lower
          : null,
      predicted_upper:
        typeof response?.data?.predicted_upper === "number"
          ? response.data.predicted_upper
          : null
    };
  } catch (error) {
    logWarn(`ML prediction failed: ${error.message}`);
    return null;
  }
};

module.exports = { getPrediction };
