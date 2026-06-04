import { useEffect, useMemo, useState } from "react";
import { subscribeWhatsapp } from "../api";

const WA_ICON = (
  <svg width="22" height="22" viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M19.11 17.2c-.3-.15-1.77-.87-2.05-.97-.28-.1-.49-.15-.7.15-.2.3-.8.97-.98 1.17-.18.2-.35.23-.65.08-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.77-1.65-2.07-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.08-.15-.7-1.67-.96-2.3-.25-.6-.5-.52-.7-.53h-.6c-.2 0-.53.08-.8.38-.28.3-1.05 1.02-1.05 2.5 0 1.48 1.07 2.9 1.22 3.1.15.2 2.1 3.2 5.1 4.49.71.31 1.27.5 1.7.64.72.23 1.37.2 1.88.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.08-.12-.28-.2-.58-.35m-3.1-9.4a7.5 7.5 0 00-6.46 11.3l-1 3.66 3.74-.98a7.5 7.5 0 003.72.98h.01a7.5 7.5 0 000-15m0 13.6h-.01a6.2 6.2 0 01-3.16-.87l-.23-.13-2.21.58.59-2.15-.15-.22a6.2 6.2 0 014.19-9.9 6.2 6.2 0 010 12.4m0-14.5a8.5 8.5 0 00-7.3 12.9L7.5 25.5l5.85-1.54a8.5 8.5 0 004.66 1.35h.01a8.5 8.5 0 000-17" />
  </svg>
);

// Props: { loading, error, crops, mandis, sandboxNumber, joinCode }
const WhatsAppCTA = ({
  loading = false,
  error = null,
  crops = [],
  mandis = [],
  sandboxNumber,
  joinCode
}) => {
  const [form, setForm] = useState({ name: "", phone: "", crop: "", mandi: "" });
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("idle"); // idle | success | error
  const [sending, setSending] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showFloating, setShowFloating] = useState(false);

  const resolvedNumber = sandboxNumber || process.env.REACT_APP_WHATSAPP_SANDBOX_NUMBER || "+14155238886";
  const resolvedJoinCode = joinCode || process.env.REACT_APP_WHATSAPP_JOIN_CODE || "";

  const mandiOptions = useMemo(() =>
    mandis.filter((m) => m.id).map((m) => ({ id: m.id, label: `${m.name} (${m.district})` })),
    [mandis]
  );
  const cropOptions = useMemo(() =>
    crops.filter((c) => c.id).map((c) => ({ id: c.id, name: c.name })),
    [crops]
  );

  const formReady = cropOptions.length > 0 && mandiOptions.length > 0;

  // Show floating button after scrolling 300px
  useEffect(() => {
    const onScroll = () => setShowFloating(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close modal on Escape
  useEffect(() => {
    if (!showModal) return;
    const onKey = (e) => { if (e.key === "Escape") setShowModal(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showModal]);

  const makeWaLink = (number, text = "HI") => {
    if (!number) return "#";
    const digits = String(number).replace(/\D/g, "");
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(
      () => setStatus("Copied!"),
      () => setStatus("Copy failed")
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("");
    if (!formReady) { setStatus("Still loading options. Please wait."); return; }
    if (!form.phone || !form.crop || !form.mandi) {
      setStatus("Please fill in your phone, crop, and mandi.");
      setStatusType("error");
      return;
    }
    setSending(true);
    try {
      const res = await subscribeWhatsapp({
        name: form.name,
        phone: form.phone,
        preferred_crop_id: form.crop,
        preferred_mandi_id: form.mandi
      });
      setStatus(res?.message || "You're subscribed! Expect updates on WhatsApp.");
      setStatusType("success");
      setForm({ name: "", phone: "", crop: "", mandi: "" });
    } catch {
      setStatus("Subscription failed. Please try again.");
      setStatusType("error");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="wa-section-skeleton" />;
  if (error) return <div className="wa-error">{error}</div>;

  const waUrl = makeWaLink(resolvedNumber, "HI");

  return (
    <>
      {/* ── Main WhatsApp section ─────────────────────────────────────── */}
      <section id="whatsapp" className="wa-section" aria-label="WhatsApp subscription">
        <div className="wa-card">
          {/* Decorative blobs */}
          <div className="wa-blob wa-blob--tl" aria-hidden="true" />
          <div className="wa-blob wa-blob--br" aria-hidden="true" />

          {/* ── Top: hero row ── */}
          <div className="wa-hero-row">
            <div className="wa-hero-left">
              {/* Icon badge with pulse ring */}
              <div className="wa-icon-wrap">
                <div className="wa-pulse-ring" aria-hidden="true" />
                <div className="wa-icon-badge">{WA_ICON}</div>
              </div>
              <div>
                <p className="wa-eyebrow">WhatsApp alerts</p>
                <h2 className="wa-heading">
                  Get mandi prices delivered to your WhatsApp — daily.
                </h2>
                <p className="wa-sub">
                  Subscribe once. Receive crop price updates and AI predictions every morning — no app needed.
                </p>
              </div>
            </div>

            <div className="wa-hero-actions">
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="wa-details-btn"
                aria-haspopup="dialog"
              >
                <span className="wa-details-btn-icon">{WA_ICON}</span>
                View details
              </button>
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="wa-chat-btn"
              >
                <span className="wa-chat-icon">{WA_ICON}</span>
                Chat now on WhatsApp
              </a>
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="wa-divider" aria-hidden="true" />

          {/* ── Bottom: subscription form ── */}
          <div className="wa-form-section">
            <div className="wa-form-header">
              <div>
                <h3 className="wa-form-title">Subscribe for daily price alerts</h3>
                <p className="wa-form-note">
                  Sandbox users only — make sure you've joined the Twilio WhatsApp sandbox first.
                </p>
              </div>
              <div className="wa-form-badge">Free</div>
            </div>

            {!formReady && (
              <div className="wa-loading-note">Loading crop and mandi options…</div>
            )}

            <form className="wa-form" onSubmit={handleSubmit} noValidate>
              <div className="wa-form-grid">
                <div className="wa-field">
                  <label className="wa-label" htmlFor="wa-name">Name (optional)</label>
                  <input
                    id="wa-name"
                    className="wa-input"
                    placeholder="Your name"
                    value={form.name}
                    autoComplete="name"
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="wa-field">
                  <label className="wa-label" htmlFor="wa-phone">WhatsApp number *</label>
                  <input
                    id="wa-phone"
                    className="wa-input"
                    placeholder="10-digit number"
                    value={form.phone}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="wa-field">
                  <label className="wa-label" htmlFor="wa-crop">Crop *</label>
                  <select
                    id="wa-crop"
                    className="wa-input wa-select"
                    value={form.crop}
                    onChange={(e) => setForm({ ...form, crop: e.target.value })}
                  >
                    <option value="">Select crop</option>
                    {cropOptions.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="wa-field">
                  <label className="wa-label" htmlFor="wa-mandi">Mandi *</label>
                  <select
                    id="wa-mandi"
                    className="wa-input wa-select"
                    value={form.mandi}
                    onChange={(e) => setForm({ ...form, mandi: e.target.value })}
                  >
                    <option value="">Select mandi</option>
                    {mandiOptions.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="wa-submit-btn"
                disabled={sending || !formReady}
              >
                {sending ? (
                  <>
                    <span className="wa-spinner" aria-hidden="true" />
                    Subscribing…
                  </>
                ) : (
                  <>
                    <span className="wa-submit-icon">{WA_ICON}</span>
                    Subscribe via WhatsApp
                  </>
                )}
              </button>
              {status && (
                <div
                  className={`wa-status ${statusType === "success" ? "wa-status--success" : statusType === "error" ? "wa-status--error" : ""}`}
                  role="status"
                >
                  {status}
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* ── Floating pill (mobile) ───────────────────────────────────── */}
      <a
        href={waUrl}
        target="_blank"
        rel="noreferrer noopener"
        className={`wa-floating-pill ${showFloating ? "wa-floating-pill--visible" : ""}`}
        aria-label="Chat on WhatsApp"
      >
        <span className="wa-floating-icon">{WA_ICON}</span>
        <span className="wa-floating-label">WhatsApp</span>
      </a>

      {/* ── Details modal ───────────────────────────────────────────── */}
      {showModal && (
        <div
          className="wa-modal-backdrop"
          onClick={() => setShowModal(false)}
          role="presentation"
        >
          <div
            className="wa-modal"
            role="dialog"
            aria-modal="true"
            aria-label="WhatsApp connection details"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="wa-modal-top">
              <div className="wa-modal-icon">{WA_ICON}</div>
              <div>
                <div className="wa-modal-eyebrow">How to connect</div>
                <div className="wa-modal-title">WhatsApp sandbox details</div>
              </div>
              <button
                type="button"
                className="wa-modal-close"
                onClick={() => setShowModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="wa-modal-steps">
              <div className="wa-step">
                <div className="wa-step-num">1</div>
                <div>
                  <div className="wa-step-label">Save this number</div>
                  <div className="wa-step-value">{resolvedNumber}</div>
                </div>
                <button
                  type="button"
                  className="wa-copy-btn"
                  onClick={() => handleCopy(resolvedNumber)}
                >
                  Copy
                </button>
              </div>

              <div className="wa-step">
                <div className="wa-step-num">2</div>
                <div>
                  <div className="wa-step-label">Send this message</div>
                  <div className="wa-step-value wa-step-value--mono">HI</div>
                </div>
              </div>

              {resolvedJoinCode && (
                <div className="wa-step">
                  <div className="wa-step-num">3</div>
                  <div>
                    <div className="wa-step-label">Join code</div>
                    <code className="wa-step-value wa-step-value--mono">{resolvedJoinCode}</code>
                  </div>
                  <button
                    type="button"
                    className="wa-copy-btn"
                    onClick={() => handleCopy(resolvedJoinCode)}
                  >
                    Copy
                  </button>
                </div>
              )}
            </div>

            <div className="wa-modal-note">
              Sandbox users only. Make sure your number has joined the Twilio WhatsApp sandbox before subscribing.
            </div>

            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="wa-chat-btn wa-chat-btn--full"
            >
              <span className="wa-chat-icon">{WA_ICON}</span>
              Open WhatsApp now
            </a>
          </div>
        </div>
      )}
    </>
  );
};

export default WhatsAppCTA;
