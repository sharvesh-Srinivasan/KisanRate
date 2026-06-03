import { useState, useEffect } from "react";
import { Bell, BellRing, X } from "lucide-react";
import { getPushPermissionState, subscribeToPush } from "../pwa";

const PushNotificationBanner = () => {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | success | error

  useEffect(() => {
    // Only show if push is supported and permission hasn't been granted/denied yet
    const permission = getPushPermissionState();
    if (permission === "default") {
      // Don't show immediately — wait 3 seconds for better UX
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSubscribe = async () => {
    setLoading(true);
    const result = await subscribeToPush();
    setLoading(false);

    if (result.success) {
      setStatus("success");
      setTimeout(() => setShow(false), 3000);
    } else {
      setStatus("error");
      if (result.reason === "denied") {
        setTimeout(() => setShow(false), 2000);
      }
    }
  };

  if (!show) return null;

  return (
    <div className="bg-white border-b border-border shadow-sm px-4 py-3 relative z-40 overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/5 rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary p-2 rounded-full shrink-0 mt-0.5 sm:mt-0">
            {status === "success" ? <BellRing size={18} /> : <Bell size={18} />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-main">
              {status === "success" ? "Notifications Enabled!" : "Get instant price alerts"}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {status === "success"
                ? "We'll notify you when new market prices and predictions are available."
                : status === "error"
                ? "Failed to enable notifications. Please check your browser settings."
                : "Subscribe to receive push notifications for crop price updates in your browser."}
            </p>
          </div>
        </div>

        {status === "idle" && (
          <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
            <button
              onClick={() => setShow(false)}
              className="px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-main transition-colors ml-auto sm:ml-0"
              disabled={loading}
            >
              Maybe later
            </button>
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-light rounded-full transition-colors whitespace-nowrap shadow-sm flex items-center gap-2 disabled:opacity-70"
            >
              {loading ? "Enabling..." : "Enable Alerts"}
            </button>
          </div>
        )}
        
        {/* Close button top right */}
        <button 
          onClick={() => setShow(false)}
          className="absolute top-0 right-0 sm:hidden text-text-muted p-1"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default PushNotificationBanner;
