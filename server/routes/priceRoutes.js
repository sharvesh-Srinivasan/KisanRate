const express = require("express");
const {
  getPrices,
  getPriceHistory,
  getCrops,
  getMandis,
  manualPriceAdd,
  refreshPredictions
} = require("../controllers/priceController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getPrices);
router.get("/history/:cropId/:mandiId", getPriceHistory);
router.get("/crops", getCrops);
router.get("/mandis", getMandis);
router.post("/manual", authenticate, manualPriceAdd);
router.post("/refresh-predictions", authenticate, refreshPredictions);

module.exports = router;
