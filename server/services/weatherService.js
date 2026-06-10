const axios = require("axios");

const logInfo = (message) => process.stdout.write(`[INFO] [WeatherService] ${new Date().toISOString()} ${message}\n`);
const logWarn = (message) => process.stderr.write(`[WARN] [WeatherService] ${new Date().toISOString()} ${message}\n`);

// Fetch lat/lon for a district, then check if rain is expected in next 3 days
const checkRainForecast = async (districtName) => {
  try {
    // 1. Get Coordinates
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(districtName)}&count=1&language=en&format=json`;
    const geoRes = await axios.get(geoUrl);
    
    if (!geoRes.data.results || geoRes.data.results.length === 0) {
      logWarn(`Geocoding failed for district: ${districtName}. Assuming no rain.`);
      return { isRainExpected: false };
    }
    
    const location = geoRes.data.results[0];
    const { latitude, longitude } = location;
    
    // 2. Get Weather Forecast
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=precipitation_probability_max&timezone=auto`;
    const weatherRes = await axios.get(weatherUrl);
    
    if (!weatherRes.data || !weatherRes.data.daily) {
      return { isRainExpected: false };
    }
    
    // Check next 3 days
    const dailyProbs = weatherRes.data.daily.precipitation_probability_max;
    const next3DaysProbs = dailyProbs.slice(1, 4); // index 0 is today, 1-3 are next 3 days
    
    const hasHighRainProb = next3DaysProbs.some(prob => prob > 50); // 50% threshold for heavy rain alert
    
    return {
      isRainExpected: hasHighRainProb,
      maxProb: Math.max(...next3DaysProbs)
    };
  } catch (error) {
    logWarn(`Error checking rain forecast for ${districtName}: ${error.message}`);
    return { isRainExpected: false };
  }
};

module.exports = {
  checkRainForecast
};
