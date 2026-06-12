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
        { timeout: 30000 }
      );

    // Retry delays in ms: reduced to avoid long hangs on cold-start
    const retryDelays = [10000, 5000, 5000];
    let lastError;

    for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
      try {
        const response = await makeRequest();
        const predicted = response?.data?.predicted_price;
        if (typeof predicted !== "number" || predicted <= 0) {
          // ML has no usable data — treat as no prediction
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
        lastError = error;
        const status = error?.response?.status;
        const code = error?.code;
        const isRetryable =
          status === 429 ||
          status === 502 ||
          status === 503 ||
          status === 504 ||
          code === "ECONNREFUSED" ||
          code === "ETIMEDOUT" ||
          code === "ECONNRESET" ||
          code === "ENOTFOUND";

        if (isRetryable && attempt < retryDelays.length) {
          const delay = retryDelays[attempt];
          await sleep(delay);
          // continue to next attempt
        } else {
          throw error;
        }
      }
    }

    throw lastError;
  } catch (error) {
    const detail = error.response?.data?.detail || error.message;
    logWarn(`ML prediction failed: ${detail}`);
    return null;
  }
};

module.exports = { getPrediction };
