const express = require("express");
const {
  getPrices,
  getPriceHistory,
  getCrops,
  getMandis,
  manualPriceAdd,
  refreshPredictions,
  predictTodayForState,
  clearStalePredictions
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

module.exports = router;
