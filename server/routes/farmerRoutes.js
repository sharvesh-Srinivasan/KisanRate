const express = require("express");
const {
  listFarmers,
  updateFarmer,
  deleteFarmer,
  subscribeFarmer
} = require("../controllers/farmerController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authenticate, listFarmers);
router.post("/subscribe", subscribeFarmer);
router.patch("/:id", authenticate, updateFarmer);
router.delete("/:id", authenticate, deleteFarmer);

module.exports = router;
