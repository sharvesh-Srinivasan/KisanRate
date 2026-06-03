const express = require("express");
const {
  getPrices,
  getPriceHistory,
  getCrops,
  getMandis,
  manualPriceAdd,
  refreshPredictions,
  predictTodayForState,
  clearStalePredictions,
  getAnalytics
} = require("../controllers/priceController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getPrices);
router.get("/history/:cropId/:mandiId", getPriceHistory);
router.get("/crops", getCrops);
router.get("/mandis", getMandis);
router.post("/manual", authenticate, manualPriceAdd);
router.post("/refresh-predictions", authenticate, refreshPredictions);
router.post("/predict-now", predictTodayForState);
router.post("/clear-stale-predictions", authenticate, clearStalePredictions);
router.get("/analytics", authenticate, getAnalytics);

module.exports = router;
