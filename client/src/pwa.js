import { getVapidPublicKey, saveSubscription } from "./api";

// Convert VAPID base64 public key to Uint8Array for browser API
const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

// Register the service worker
export const registerServiceWorker = async () => {
  if (!("serviceWorker" in navigator)) return;

  try {
    await navigator.serviceWorker.register("/service-worker.js", { scope: "/" });
  } catch (err) {
    console.warn("[SW] Registration failed:", err);
  }
};

// Request permission + subscribe to Web Push + save to backend
export const subscribeToPush = async () => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { success: false, reason: "not_supported" };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { success: false, reason: "denied" };
  }

  try {
    const { data } = await getVapidPublicKey();
    const publicKey = data?.publicKey;
    if (!publicKey) return { success: false, reason: "no_vapid_key" };

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    await saveSubscription(subscription.toJSON());
    return { success: true };
  } catch (err) {
    console.warn("[Push] Subscribe failed:", err);
    return { success: false, reason: "error" };
  }
};

// Check current push permission state without prompting
export const getPushPermissionState = () => {
  if (!("Notification" in window)) return "not_supported";
  return Notification.permission; // 'default' | 'granted' | 'denied'
};
