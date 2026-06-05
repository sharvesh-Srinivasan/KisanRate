const express = require("express");
const {
  sendOtpHandler,
  verifyOtpHandler,
  getFarmerProfile,
  updateFarmerProfile
} = require("../controllers/farmerAuthController");
const { authenticateFarmer } = require("../middleware/authMiddleware");

const router = express.Router();

// Public — no auth needed
router.post("/send-otp", sendOtpHandler);
router.post("/verify-otp", verifyOtpHandler);

// Protected — farmer JWT required
router.get("/profile", authenticateFarmer, getFarmerProfile);
router.patch("/profile", authenticateFarmer, updateFarmerProfile);

module.exports = router;
