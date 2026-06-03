const express = require("express");
const { getVapidPublicKey, subscribe } = require("../controllers/pushController");

const router = express.Router();

router.get("/vapid-public-key", getVapidPublicKey);
router.post("/subscribe", subscribe);

module.exports = router;
