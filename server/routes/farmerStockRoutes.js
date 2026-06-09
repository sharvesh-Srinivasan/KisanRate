const express = require("express");
const {
  listStock,
  addStock,
  updateStock,
  deleteStock,
  getPortfolio,
  getSellAdvice,
  compareMandis
} = require("../controllers/farmerStockController");
const { authenticateFarmer } = require("../middleware/authMiddleware");

const router = express.Router();

// All routes require farmer JWT
router.use(authenticateFarmer);

router.get("/stock", listStock);
router.post("/stock", addStock);
router.patch("/stock/:id", updateStock);
router.delete("/stock/:id", deleteStock);

router.get("/portfolio", getPortfolio);
router.get("/sell-advice", getSellAdvice);
router.post("/compare-mandis", compareMandis);

router.get("/transporters", require("../controllers/farmerStockController").getTransporters);
router.post("/sell-confirm", require("../controllers/farmerStockController").confirmSale);
router.get("/sales-history", require("../controllers/farmerStockController").getSalesHistory);

module.exports = router;
