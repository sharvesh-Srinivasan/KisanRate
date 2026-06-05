import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { farmerSendOtp, farmerVerifyOtp } from "../api";

// ── Tiny SVG Icons ─────────────────────────────────────────────────────────────
const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.22 1.22 2 2 0 012.18 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.91 8a16 16 0 006.09 6.09l1.36-1.36a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
  </svg>
);

const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>
);

const LeafIcon = () => (
  <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
    <path d="M18 40C18 28 12 18 8 12" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M30 40C30 28 36 18 40 12" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M16 22C14 18 12 16 10 14" stroke="#86efac" strokeWidth="2" strokeLinecap="round"/>
    <path d="M32 22C34 18 36 16 38 14" stroke="#86efac" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// ── OTP Input Component ────────────────────────────────────────────────────────
const OtpInput = ({ value, onChange }) => {
  const inputsRef = useRef([]);
  const digits = value.split("").concat(Array(6).fill("")).slice(0, 6);

  const handleKey = (e, idx) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
  };

  const handleChange = (e, idx) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      const next = digits.slice();
      next[idx] = "";
      onChange(next.join("").slice(0, 6));
      return;
    }
    // Handle paste — fill from current position
    const pasted = raw.slice(0, 6 - idx);
    const next = digits.slice();
    for (let i = 0; i < pasted.length; i++) next[idx + i] = pasted[i];
    onChange(next.join("").slice(0, 6));
    const focusIdx = Math.min(idx + pasted.length, 5);
    inputsRef.current[focusIdx]?.focus();
  };

  return (
    <div className="farmer-otp-grid">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (inputsRef.current[i] = el)}
          id={`farmer-otp-digit-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={d}
          className={`farmer-otp-box ${d ? "farmer-otp-box--filled" : ""}`}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKey(e, i)}
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const FarmerLogin = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState("phone"); // "phone" | "otp" | "profile"
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [district, setDistrict] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [devMode, setDevMode] = useState(false);
  const [shake, setShake] = useState(false);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "").replace(/^91/, "").slice(-10);
    if (digits.length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      triggerShake();
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await farmerSendOtp(digits);
      if (res.success) {
        setDevMode(res.data?.devMode || false);
        setSuccessMsg(res.message);
        setCooldown(60);
        setStep("otp");
        
        // Auto-fill and alert in Demo Mode
        if (res.data?.demoOtp) {
          setTimeout(() => {
            alert(`🚜 PORTFOLIO DEMO MODE\n\nYour OTP is: ${res.data.demoOtp}`);
            setOtp(res.data.demoOtp);
          }, 400);
        }
      } else {
        setError(res.message || "Failed to send OTP");
        triggerShake();
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to send OTP. Try again.");
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("Enter the 6-digit OTP");
      triggerShake();
      return;
    }

    setLoading(true);
    setError("");
    try {
      const digits = phone.replace(/\D/g, "").replace(/^91/, "").slice(-10);
      const res = await farmerVerifyOtp(digits, otp, name || null, district || null);
      if (res.success) {
        localStorage.setItem("kisanrate_farmer_token", res.data.token);
        localStorage.setItem("kisanrate_farmer", JSON.stringify(res.data.farmer));
        navigate("/farmer/dashboard");
      } else {
        setError(res.message || "Invalid OTP");
        triggerShake();
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Verification failed. Try again.");
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setOtp("");
    setError("");
    setLoading(true);
    try {
      const digits = phone.replace(/\D/g, "").replace(/^91/, "").slice(-10);
      const res = await farmerSendOtp(digits);
      if (res.success) {
        setDevMode(res.data?.devMode || false);
        setSuccessMsg("New OTP sent!");
        setCooldown(60);
        
        if (res.data?.demoOtp) {
          setTimeout(() => {
            alert(`🚜 PORTFOLIO DEMO MODE\n\nYour new OTP is: ${res.data.demoOtp}`);
            setOtp(res.data.demoOtp);
          }, 400);
        }
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="farmer-login-shell">
      {/* Animated background */}
      <div className="farmer-login-orb farmer-login-orb--1" />
      <div className="farmer-login-orb farmer-login-orb--2" />
      <div className="farmer-login-orb farmer-login-orb--3" />

      {/* Content */}
      <div className="farmer-login-content">
        {/* Brand */}
        <div className="farmer-login-brand">
          <div className="farmer-login-brand-icon">
            <LeafIcon />
          </div>
          <div>
            <span className="farmer-login-brand-name">KisanRate</span>
            <span className="farmer-login-brand-tag">Farmer Portal</span>
          </div>
        </div>

        {/* Card */}
        <div className={`farmer-login-card ${shake ? "farmer-login-card--shake" : ""}`}>

          {/* ── Step: Phone ──────────────────────────────────────────────── */}
          {step === "phone" && (
            <>
              <div className="farmer-login-card-header">
                <div className="farmer-login-icon-badge">
                  <PhoneIcon />
                </div>
                <div>
                  <h1 className="farmer-login-title">Enter Mobile Number</h1>
                  <p className="farmer-login-subtitle">
                    We'll send a one-time code to your WhatsApp number
                  </p>
                </div>
              </div>

              <div className="farmer-login-sep" />

              <form onSubmit={handleSendOtp} className="farmer-login-form" noValidate>
                <div className="farmer-login-field">
                  <label className="farmer-login-label" htmlFor="farmer-phone">
                    Mobile Number
                  </label>
                  <div className="farmer-login-input-wrap">
                    <span className="farmer-login-prefix">+91</span>
                    <input
                      id="farmer-phone"
                      type="tel"
                      inputMode="numeric"
                      className="farmer-login-input farmer-login-input--phone"
                      placeholder="9876543210"
                      value={phone}
                      maxLength={10}
                      autoFocus
                      autoComplete="tel"
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    />
                  </div>
                </div>

                {/* Optional: Name & District (filled once here or on profile page) */}
                <div className="farmer-login-field">
                  <label className="farmer-login-label" htmlFor="farmer-name">
                    Your Name <span className="farmer-login-optional">(optional)</span>
                  </label>
                  <input
                    id="farmer-name"
                    type="text"
                    className="farmer-login-input"
                    placeholder="e.g. Ramesh Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="farmer-login-field">
                  <label className="farmer-login-label" htmlFor="farmer-district">
                    District <span className="farmer-login-optional">(optional)</span>
                  </label>
                  <input
                    id="farmer-district"
                    type="text"
                    className="farmer-login-input"
                    placeholder="e.g. Coimbatore"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                  />
                </div>

                {error && (
                  <div className="farmer-login-error" role="alert">
                    <span className="farmer-login-error-dot" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="farmer-login-submit-btn"
                  disabled={loading || phone.length < 10}
                  id="farmer-send-otp-btn"
                >
                  {loading ? (
                    <>
                      <span className="farmer-login-spinner" />
                      Sending OTP…
                    </>
                  ) : (
                    <>
                      <PhoneIcon />
                      Send OTP
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* ── Step: OTP ────────────────────────────────────────────────── */}
          {step === "otp" && (
            <>
              <div className="farmer-login-card-header">
                <div className="farmer-login-icon-badge farmer-login-icon-badge--green">
                  <ShieldIcon />
                </div>
                <div>
                  <h1 className="farmer-login-title">Enter OTP</h1>
                  <p className="farmer-login-subtitle">
                    Sent to +91 {phone.slice(0, 2)}••••••{phone.slice(-2)}
                  </p>
                </div>
              </div>

              {devMode && (
                <div className="farmer-login-devmode-banner">
                  🛠 Portfolio Demo Mode: SMS bypassed. OTP has been auto-filled.
                </div>
              )}

              {successMsg && !error && (
                <div className="farmer-login-success" role="status">
                  ✅ {successMsg}
                </div>
              )}

              <div className="farmer-login-sep" />

              <form onSubmit={handleVerifyOtp} className="farmer-login-form" noValidate>
                <div className="farmer-login-field">
                  <label className="farmer-login-label">6-Digit OTP</label>
                  <OtpInput value={otp} onChange={setOtp} />
                </div>

                {error && (
                  <div className="farmer-login-error" role="alert">
                    <span className="farmer-login-error-dot" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="farmer-login-submit-btn"
                  disabled={loading || otp.length !== 6}
                  id="farmer-verify-otp-btn"
                >
                  {loading ? (
                    <>
                      <span className="farmer-login-spinner" />
                      Verifying…
                    </>
                  ) : (
                    <>
                      <ShieldIcon />
                      Verify & Login
                    </>
                  )}
                </button>

                <div className="farmer-login-resend-row">
                  <button
                    type="button"
                    className={`farmer-login-resend-btn ${cooldown > 0 ? "farmer-login-resend-btn--disabled" : ""}`}
                    onClick={handleResend}
                    disabled={cooldown > 0 || loading}
                  >
                    {cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
                  </button>
                  <button
                    type="button"
                    className="farmer-login-change-btn"
                    onClick={() => { setStep("phone"); setError(""); setOtp(""); }}
                  >
                    Change Number
                  </button>
                </div>
              </form>
            </>
          )}

          <p className="farmer-login-footer-note">
            🌾 KisanRate — Real-time mandi prices for Indian farmers
          </p>
        </div>

        <a href="/" className="farmer-login-back-link">
          ← Back to main site
        </a>
      </div>
    </div>
  );
};

export default FarmerLogin;
