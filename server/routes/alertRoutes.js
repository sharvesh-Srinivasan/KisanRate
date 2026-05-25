const express = require("express");
const { triggerAlertTest } = require("../controllers/alertController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/test", authenticate, triggerAlertTest);

module.exports = router;
