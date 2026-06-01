import { useMemo, useState } from "react";
import { subscribeWhatsapp } from "../api";

// Props: { loading?: boolean, error?: string | null, crops?: Array, mandis?: Array, sandboxNumber?: string, joinCode?: string }
const WhatsAppCTA = ({
  loading = false,
  error = null,
  crops = [],
  mandis = [],
  sandboxNumber,
  joinCode
}) => {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    crop: "",
    mandi: ""
  });
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  const resolvedSandboxNumber =
    sandboxNumber || process.env.REACT_APP_WHATSAPP_SANDBOX_NUMBER || "+14155238886";
  const resolvedJoinCode =
    joinCode || process.env.REACT_APP_WHATSAPP_JOIN_CODE || process.env.REACT_APP_WHATSAPP_JOIN || "";

  const mandiOptions = useMemo(() => {
    if (!mandis.length) return [];
    return mandis
      .filter((mandi) => mandi.id)
      .map((mandi) => ({
        id: mandi.id,
        label: `${mandi.name} (${mandi.district})`
      }));
  }, [mandis]);

  const cropOptions = useMemo(() => {
    if (!crops.length) return [];
    return crops
      .filter((crop) => crop.id)
      .map((crop) => ({
        id: crop.id,
        name: crop.name
      }));
  }, [crops]);

  const formReady = cropOptions.length > 0 && mandiOptions.length > 0;
  if (loading) {
    return <div className="w-full h-48 bg-primary/20 animate-pulse" />;
  }

  if (error) {
    return (
      <div className="w-full py-10 text-center text-danger text-sm">{error}</div>
    );
  }

  const makeWaLink = (number, text = "HI") => {
    if (!number) return "";
    const digits = String(number).replace(/\D/g, "");
    const stripped = digits.startsWith("+") ? digits.slice(1) : digits;
    const encoded = encodeURIComponent(text);
    return `https://wa.me/${stripped}?text=${encoded}`;
  };

  const handleCopy = (text) => {
    try {
      navigator.clipboard.writeText(text);
      setStatus("Copied to clipboard");
    } catch (e) {
      setStatus("Copy failed");
    }
  };

  const waUrl = makeWaLink(resolvedSandboxNumber || "+14155238886", "HI");

  return (
    <section id="whatsapp" className="w-full cta-surface py-12 px-6 text-center">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col items-center gap-4">
          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="whatsapp-logo-badge"
            aria-label="Open WhatsApp chat"
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 32 32"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className="text-white"
            >
              <path d="M19.11 17.2c-.3-.15-1.77-.87-2.05-.97-.28-.1-.49-.15-.7.15-.2.3-.8.97-.98 1.17-.18.2-.35.23-.65.08-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.77-1.65-2.07-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.08-.15-.7-1.67-.96-2.3-.25-.6-.5-.52-.7-.53h-.6c-.2 0-.53.08-.8.38-.28.3-1.05 1.02-1.05 2.5 0 1.48 1.07 2.9 1.22 3.1.15.2 2.1 3.2 5.1 4.49.71.31 1.27.5 1.7.64.72.23 1.37.2 1.88.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.08-.12-.28-.2-.58-.35m-3.1-9.4a7.5 7.5 0 00-6.46 11.3l-1 3.66 3.74-.98a7.5 7.5 0 003.72.98h.01a7.5 7.5 0 000-15m0 13.6h-.01a6.2 6.2 0 01-3.16-.87l-.23-.13-2.21.58.59-2.15-.15-.22a6.2 6.2 0 014.19-9.9 6.2 6.2 0 010 12.4m0-14.5a8.5 8.5 0 00-7.3 12.9L7.5 25.5l5.85-1.54a8.5 8.5 0 004.66 1.35h.01a8.5 8.5 0 000-17" />
            </svg>
          </a>
          <span className="text-white/80 text-xs uppercase tracking-[0.35em]">
            WhatsApp updates
          </span>
          <h2 className="font-display text-3xl md:text-4xl text-white font-bold">
            Get prices on WhatsApp
          </h2>
          <p className="text-white/80 mt-1 text-base md:text-lg max-w-2xl">
            No app download needed. Send a single message to receive live mandi
            prices, daily alerts, and crop insights.
          </p>
        </div>

        <div className="mt-8 flex flex-col md:flex-row gap-5 justify-center items-center">
          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="whatsapp-cta-button"
          >
            <span className="whatsapp-cta-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 32 32"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path d="M19.11 17.2c-.3-.15-1.77-.87-2.05-.97-.28-.1-.49-.15-.7.15-.2.3-.8.97-.98 1.17-.18.2-.35.23-.65.08-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.77-1.65-2.07-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.08-.15-.7-1.67-.96-2.3-.25-.6-.5-.52-.7-.53h-.6c-.2 0-.53.08-.8.38-.28.3-1.05 1.02-1.05 2.5 0 1.48 1.07 2.9 1.22 3.1.15.2 2.1 3.2 5.1 4.49.71.31 1.27.5 1.7.64.72.23 1.37.2 1.88.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.08-.12-.28-.2-.58-.35m-3.1-9.4a7.5 7.5 0 00-6.46 11.3l-1 3.66 3.74-.98a7.5 7.5 0 003.72.98h.01a7.5 7.5 0 000-15m0 13.6h-.01a6.2 6.2 0 01-3.16-.87l-.23-.13-2.21.58.59-2.15-.15-.22a6.2 6.2 0 014.19-9.9 6.2 6.2 0 010 12.4m0-14.5a8.5 8.5 0 00-7.3 12.9L7.5 25.5l5.85-1.54a8.5 8.5 0 004.66 1.35h.01a8.5 8.5 0 000-17" />
              </svg>
            </span>
            Chat on WhatsApp
          </a>
          <div className="text-white/70 text-sm"> 
            Or send "HI" to <strong className="text-white">{resolvedSandboxNumber}</strong>
          </div>
          {resolvedJoinCode ? (
            <div className="text-white/80 text-sm flex items-center gap-2">
              <span>Join code:</span>
              <code className="bg-white/10 px-2 py-1 rounded">{resolvedJoinCode}</code>
              <button
                type="button"
                onClick={() => handleCopy(resolvedJoinCode)}
                className="bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition"
              >
                Copy
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-10 bg-white/10 rounded-2xl p-6 text-left">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-white font-semibold text-lg">
                Subscribe for daily alerts
              </h3>
              <p className="text-white/70 text-sm mt-1">
                Sandbox users only. Make sure your number has joined the Twilio WhatsApp
                sandbox before subscribing.
              </p>
            </div>
            <div className="text-white/70 text-xs">
              Response within minutes after price updates.
            </div>
          </div>
          {!formReady && (
            <div className="text-white/70 text-sm mt-3">
              Loading crops and mandis. Please refresh in a moment.
            </div>
          )}
          <form
            className="mt-4 grid gap-3 md:grid-cols-2"
            onSubmit={async (event) => {
              event.preventDefault();
              setStatus("");
              if (!formReady) {
                setStatus("Crops and mandis are still loading.");
                return;
              }
              if (!form.phone || !form.crop || !form.mandi) {
                setStatus("Please fill phone, crop, and mandi.");
                return;
              }
              setSending(true);
              try {
                const response = await subscribeWhatsapp({
                  name: form.name,
                  phone: form.phone,
                  preferred_crop_id: form.crop,
                  preferred_mandi_id: form.mandi
                });
                setStatus(response?.message || "Subscription saved.");
                setForm({ name: "", phone: "", crop: "", mandi: "" });
              } catch (err) {
                setStatus("Failed to save subscription.");
              } finally {
                setSending(false);
              }
            }}
          >
            <input
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
              placeholder="Name (optional)"
              value={form.name}
              autoComplete="name"
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
            <input
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
              placeholder="WhatsApp number (10 digits)"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
            />
            <select
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
              value={form.crop}
              onChange={(event) => setForm({ ...form, crop: event.target.value })}
            >
              <option value="">Select crop</option>
              {cropOptions.map((crop) => (
                <option key={crop.id} value={crop.id}>
                  {crop.name}
                </option>
              ))}
            </select>
            <select
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
              value={form.mandi}
              onChange={(event) => setForm({ ...form, mandi: event.target.value })}
            >
              <option value="">Select mandi</option>
              {mandiOptions.map((mandi) => (
                <option key={mandi.id} value={mandi.id}>
                  {mandi.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="md:col-span-2 bg-white text-primary font-semibold rounded-xl px-6 py-3 hover:bg-accent-light transition disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
              disabled={sending || !formReady}
            >
              {sending ? "Saving..." : "Subscribe via WhatsApp"}
            </button>
          </form>
          {status && (
            <div className="text-white/80 text-sm mt-3" role="status">
              {status}
            </div>
          )}
        </div>
      </div>
      <a
        href={waUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="whatsapp-fab"
        aria-label="Chat on WhatsApp"
      >
        <svg width="22" height="22" viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M19.11 17.2c-.3-.15-1.77-.87-2.05-.97-.28-.1-.49-.15-.7.15-.2.3-.8.97-.98 1.17-.18.2-.35.23-.65.08-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.77-1.65-2.07-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.08-.15-.7-1.67-.96-2.3-.25-.6-.5-.52-.7-.53h-.6c-.2 0-.53.08-.8.38-.28.3-1.05 1.02-1.05 2.5 0 1.48 1.07 2.9 1.22 3.1.15.2 2.1 3.2 5.1 4.49.71.31 1.27.5 1.7.64.72.23 1.37.2 1.88.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.08-.12-.28-.2-.58-.35m-3.1-9.4a7.5 7.5 0 00-6.46 11.3l-1 3.66 3.74-.98a7.5 7.5 0 003.72.98h.01a7.5 7.5 0 000-15m0 13.6h-.01a6.2 6.2 0 01-3.16-.87l-.23-.13-2.21.58.59-2.15-.15-.22a6.2 6.2 0 014.19-9.9 6.2 6.2 0 010 12.4m0-14.5a8.5 8.5 0 00-7.3 12.9L7.5 25.5l5.85-1.54a8.5 8.5 0 004.66 1.35h.01a8.5 8.5 0 000-17" />
        </svg>
      </a>
    </section>
  );
};

export default WhatsAppCTA;
