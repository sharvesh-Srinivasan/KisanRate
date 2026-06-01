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
