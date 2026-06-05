import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginAdmin } from "../api";
import { Eye, EyeOff, Lock, User, ShieldCheck } from "lucide-react";

const Login = ({ loading = false, error = null }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [shake, setShake] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      const response = await loginAdmin(username, password);
      if (response.success) {
        localStorage.setItem("kisanrate_token", response.data.token);
        navigate("/admin");
      } else {
        setFormError(response.message || "Invalid credentials. Please try again.");
        triggerShake();
      }
    } catch {
      setFormError("Invalid credentials. Please try again.");
      triggerShake();
    } finally {
      setSubmitting(false);
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  if (loading) return <div className="login-shell animate-pulse" />;
  if (error) return <div className="login-shell flex items-center justify-center text-red-400">{error}</div>;

  return (
    <div className="login-shell">
      {/* Animated background orbs */}
      <div className="login-orb login-orb--1" />
      <div className="login-orb login-orb--2" />
      <div className="login-orb login-orb--3" />

      {/* Grid pattern overlay */}
      <div className="login-grid-overlay" aria-hidden="true" />

      <div className="login-content">
        {/* Brand mark */}
        <div className="login-brand">
          <div className="login-brand-icon">
            <svg width="26" height="26" viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <path d="M18 40C18 28 12 18 8 12" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M30 40C30 28 36 18 40 12" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M16 22C14 18 12 16 10 14" stroke="#86efac" strokeWidth="2" strokeLinecap="round"/>
              <path d="M32 22C34 18 36 16 38 14" stroke="#86efac" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="login-brand-name">KisanRate</span>
        </div>

        {/* Card */}
        <div className={`login-card ${shake ? "login-card--shake" : ""}`}>
          {/* Card header */}
          <div className="login-card-header">
            <div className="login-shield-badge">
              <ShieldCheck size={22} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="login-title">Admin Portal</h1>
              <p className="login-subtitle">Secure access for administrators only</p>
            </div>
          </div>

          {/* Separator */}
          <div className="login-sep" />

          {/* Form */}
          <form onSubmit={handleSubmit} className="login-form" noValidate>
            {/* Username */}
            <div className="login-field">
              <label className="login-label" htmlFor="login-username">Username</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">
                  <User size={15} />
                </span>
                <input
                  id="login-username"
                  type="text"
                  className="login-input"
                  placeholder="Enter your username"
                  value={username}
                  autoComplete="username"
                  autoFocus
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            {/* Password */}
            <div className="login-field">
              <label className="login-label" htmlFor="login-password">Password</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">
                  <Lock size={15} />
                </span>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  className="login-input login-input--padright"
                  placeholder="Enter your password"
                  value={password}
                  autoComplete="current-password"
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowPassword((p) => !p)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {formError && (
              <div className="login-error" role="alert">
                <span className="login-error-dot" />
                {formError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="login-submit-btn"
              disabled={submitting || !username || !password}
            >
              {submitting ? (
                <>
                  <span className="login-spinner" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  Sign in to Dashboard
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <p className="login-footer-note">
            🌾 KisanRate Admin — Tamil Nadu Mandi Intelligence Platform
          </p>
        </div>

        {/* Back to home */}
        <a href="/" className="login-back-link">
          ← Back to main site
        </a>
      </div>
    </div>
  );
};

export default Login;
