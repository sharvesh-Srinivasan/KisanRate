const express = require("express");
const {
  listStock,
  addStock,
  updateStock,
  deleteStock,
  getPortfolio,
  getSellAdvice
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

module.exports = router;
