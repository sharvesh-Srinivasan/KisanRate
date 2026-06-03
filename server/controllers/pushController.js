const webpush = require("web-push");
const db = require("../config/db");

const timestamp = () => new Date().toISOString();
const logWarn = (message) => {
  process.stderr.write(`[WARN] ${timestamp()} ${message}\n`);
};
const logInfo = (message) => {
  process.stdout.write(`[INFO] ${timestamp()} ${message}\n`);
};

webpush.setVapidDetails(
  "mailto:admin@kisanrate.com",
  process.env.VAPID_PUBLIC_KEY || "",
  process.env.VAPID_PRIVATE_KEY || ""
);

// GET /api/push/vapid-public-key — returns public key so client can subscribe
const getVapidPublicKey = (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY || "";
  return res.json({ success: true, data: { publicKey: key } });
};

// POST /api/push/subscribe — saves browser push subscription to DB
const subscribe = async (req, res) => {
  try {
    const subscription = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ success: false, message: "Invalid subscription" });
    }

    const endpoint = subscription.endpoint;
    const auth = subscription.keys?.auth || null;
    const p256dh = subscription.keys?.p256dh || null;
    const subscriptionJson = JSON.stringify(subscription);

    await db.query(
      `INSERT INTO push_subscriptions (endpoint, auth, p256dh, subscription_json)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         auth = VALUES(auth),
         p256dh = VALUES(p256dh),
         subscription_json = VALUES(subscription_json),
         updated_at = NOW()`,
      [endpoint, auth, p256dh, subscriptionJson]
    );

    logInfo(`Push subscription saved: ${endpoint.slice(0, 60)}...`);
    return res.json({ success: true, message: "Subscribed to push notifications" });
  } catch (error) {
    logWarn(`Push subscribe failed: ${error.message}`);
    return res.status(500).json({ success: false, message: "Failed to save subscription" });
  }
};

// Called internally by alert jobs to send push to all browser subscribers
const sendPushToAll = async (payload) => {
  try {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      return; // VAPID not configured — skip silently
    }

    const [rows] = await db.query(
      "SELECT subscription_json FROM push_subscriptions"
    );

    const payloadStr = JSON.stringify(payload);
    let sent = 0;
    let failed = 0;

    await Promise.allSettled(
      rows.map(async (row) => {
        try {
          const sub = JSON.parse(row.subscription_json);
          await webpush.sendNotification(sub, payloadStr);
          sent++;
        } catch (err) {
          failed++;
          // Remove expired/invalid subscriptions (410 Gone)
          if (err.statusCode === 410 || err.statusCode === 404) {
            try {
              const sub = JSON.parse(row.subscription_json);
              await db.query(
                "DELETE FROM push_subscriptions WHERE endpoint = ?",
                [sub.endpoint]
              );
            } catch (_) {}
          }
        }
      })
    );

    logInfo(`Push notifications: ${sent} sent, ${failed} failed`);
  } catch (error) {
    logWarn(`sendPushToAll failed: ${error.message}`);
  }
};

module.exports = { getVapidPublicKey, subscribe, sendPushToAll };
