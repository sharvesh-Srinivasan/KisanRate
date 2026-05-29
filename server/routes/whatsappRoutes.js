const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  whatsappWebhook,
  getWhatsappLogs,
  testSendWhatsApp
} = require("../controllers/whatsappController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});

const testLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false
});

router.post("/webhook", webhookLimiter, whatsappWebhook);
router.post("/test-send", testLimiter, testSendWhatsApp);
router.get("/logs", authenticate, getWhatsappLogs);

module.exports = router;
