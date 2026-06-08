import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:4000"
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("kisanrate_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getPrices = async (filters = {}) => {
  const params = {
    crop: filters.crop || "",
    district: filters.district || "",
    state: filters.state || ""
  };
  const response = await apiClient.get("/api/prices", { params });
  return response.data;
};

export const getCrops = async () => {
  const response = await apiClient.get("/api/prices/crops");
  return response.data;
};

export const getMandis = async () => {
  const response = await apiClient.get("/api/prices/mandis");
  return response.data;
};

export const getPriceHistory = async (cropId, mandiId) => {
  const response = await apiClient.get(
    `/api/prices/history/${cropId}/${mandiId}`
  );
  return response.data;
};

export const loginAdmin = async (username, password) => {
  const response = await apiClient.post("/api/auth/login", {
    username,
    password
  });
  return response.data;
};

export const getAdminFarmers = async () => {
  const response = await apiClient.get("/api/farmers");
  return response.data;
};

export const updateFarmer = async (id, data) => {
  const response = await apiClient.patch(`/api/farmers/${id}`, data);
  return response.data;
};

export const deleteFarmer = async (id) => {
  const response = await apiClient.delete(`/api/farmers/${id}`);
  return response.data;
};

export const getWhatsappLogs = async () => {
  const response = await apiClient.get("/api/whatsapp/logs");
  return response.data;
};

export const triggerTestAlert = async () => {
  const response = await apiClient.post("/api/alerts/test");
  return response.data;
};

export const manualPriceAdd = async (data) => {
  const response = await apiClient.post("/api/prices/manual", data);
  return response.data;
};

export const refreshPredictions = async () => {
  const response = await apiClient.post("/api/prices/refresh-predictions");
  return response.data;
};

export const predictTodayForState = async (state) => {
  const response = await apiClient.post("/api/prices/predict-now", { state });
  return response.data;
};

export const subscribeWhatsapp = async (payload) => {
  const response = await apiClient.post("/api/farmers/subscribe", payload);
  return response.data;
};

export const clearStalePredictions = async () => {
  const response = await apiClient.post("/api/prices/clear-stale-predictions");
  return response.data;
};

export const getAnalytics = async () => {
  const response = await apiClient.get("/api/prices/analytics");
  return response.data;
};

export const getVapidPublicKey = async () => {
  const response = await apiClient.get("/api/push/vapid-public-key");
  return response.data;
};

export const saveSubscription = async (subscription) => {
  const response = await apiClient.post("/api/push/subscribe", subscription);
  return response.data;
};

export const reportPrice = async (priceId, data) => {
  const response = await apiClient.post(`/api/prices/${priceId}/report`, data);
  return response.data;
};

export const getPriceReports = async () => {
  const response = await apiClient.get("/api/prices/reports");
  return response.data;
};

// ── Farmer Auth ─────────────────────────────────────────────────────────────

export const farmerSendOtp = async (phone) => {
  const response = await apiClient.post("/api/farmer-auth/send-otp", { phone });
  return response.data;
};

export const farmerVerifyOtp = async (phone, otp, name, district) => {
  const response = await apiClient.post("/api/farmer-auth/verify-otp", {
    phone,
    otp,
    name,
    district
  });
  return response.data;
};

export const getFarmerProfile = async () => {
  const token = localStorage.getItem("kisanrate_farmer_token");
  const response = await apiClient.get("/api/farmer-auth/profile", {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const updateFarmerProfile = async (data) => {
  const token = localStorage.getItem("kisanrate_farmer_token");
  const response = await apiClient.patch("/api/farmer-auth/profile", data, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

// ── Farmer Stock ─────────────────────────────────────────────────────────────

const farmerHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("kisanrate_farmer_token")}`
});

export const getFarmerStock = async () => {
  const response = await apiClient.get("/api/farmer/stock", { headers: farmerHeaders() });
  return response.data;
};

export const addFarmerStock = async (data) => {
  const response = await apiClient.post("/api/farmer/stock", data, { headers: farmerHeaders() });
  return response.data;
};

export const updateFarmerStock = async (id, data) => {
  const response = await apiClient.patch(`/api/farmer/stock/${id}`, data, {
    headers: farmerHeaders()
  });
  return response.data;
};

export const deleteFarmerStock = async (id) => {
  const response = await apiClient.delete(`/api/farmer/stock/${id}`, {
    headers: farmerHeaders()
  });
  return response.data;
};

export const getFarmerPortfolio = async () => {
  const response = await apiClient.get("/api/farmer/portfolio", { headers: farmerHeaders() });
  return response.data;
};

export const getFarmerSellAdvice = async (params) => {
  const response = await apiClient.get("/api/farmer/sell-advice", {
    headers: farmerHeaders(),
    params
  });
  return response.data;
};

export const compareMandis = async (data) => {
  const response = await apiClient.post("/api/farmer/compare-mandis", data, {
    headers: farmerHeaders()
  });
  return response.data;
};
