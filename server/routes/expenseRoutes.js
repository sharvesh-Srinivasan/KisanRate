const express = require("express");
const { getExpenses, addExpense, deleteExpense } = require("../controllers/expenseController");
const { authenticateFarmer } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateFarmer);

router.get("/", getExpenses);
router.post("/", addExpense);
router.delete("/:id", deleteExpense);

module.exports = router;
