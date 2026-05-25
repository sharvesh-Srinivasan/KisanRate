const express = require("express");
const {
  listFarmers,
  updateFarmer,
  deleteFarmer
} = require("../controllers/farmerController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authenticate, listFarmers);
router.patch("/:id", authenticate, updateFarmer);
router.delete("/:id", authenticate, deleteFarmer);

module.exports = router;
