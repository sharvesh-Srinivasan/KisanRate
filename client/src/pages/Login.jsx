import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginAdmin } from "../api";

// Props: { loading?: boolean, error?: string | null }
const Login = ({ loading = false, error = null }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

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
        setFormError(response.message || "Invalid username or password");
      }
    } catch (err) {
      setFormError("Invalid username or password");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-cream animate-pulse" />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center text-danger">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex items-start justify-center">
      <div className="bg-white border border-border rounded-2xl p-10 max-w-sm w-full shadow-sm mx-auto mt-24">
        <div className="flex items-center gap-3 mb-6">
          <svg
            width="32"
            height="32"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M18 40C18 28 12 18 8 12"
              stroke="#3B6E2F"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M30 40C30 28 36 18 40 12"
              stroke="#3B6E2F"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <div className="font-display text-soil text-xl font-bold">
            KisanRate
          </div>
        </div>
        <h1 className="font-display text-2xl text-text-main mb-6">
          Admin Login
        </h1>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            className="w-full border border-border rounded-lg px-4 py-2.5 bg-white focus:ring-2 focus:ring-primary/30 focus:outline-none"
            placeholder="Username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <input
            type="password"
            className="w-full border border-border rounded-lg px-4 py-2.5 bg-white focus:ring-2 focus:ring-primary/30 focus:outline-none"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-white rounded-lg py-3 font-semibold hover:bg-primary-light transition-colors duration-200"
          >
            {submitting ? "Signing in..." : "Login"}
          </button>
          {formError && (
            <div className="text-danger text-sm">{formError}</div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Login;
