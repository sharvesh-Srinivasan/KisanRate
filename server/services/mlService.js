const axios = require("axios");

const timestamp = () => new Date().toISOString();
const logWarn = (message) => {
  process.stderr.write(`[WARN] ${timestamp()} ${message}\n`);
};

const getPrediction = async (cropName, mandiName) => {
  try {
    const response = await axios.post(
      `${process.env.ML_SERVICE_URL}/predict`,
      {
        crop: cropName,
        mandi: mandiName
      }
    );
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
