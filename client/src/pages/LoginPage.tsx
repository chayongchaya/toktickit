import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { ApiError } from "../api.js";

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      if (user.mustChangePassword) {
        navigate("/change-password", { replace: true });
      } else {
        // Send each role to its first available workspace after authentication.
        const roleHome = user.role === "ADMINISTRATOR" ? "/admin/users" : user.role === "IT_STAFF" ? "/queue" : "/tickets";
        navigate(location.state?.from ?? roleHome, { replace: true });
      }
    } catch (err) {
      // BR-01/AC-05: identical copy for wrong password and inactive
      // account — the server already collapses both into one message, so
      // we simply display whatever it sent rather than re-branching here.
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-start align-items-md-center min-vh-100 bg-light py-5 px-3">
      <div
        className="card border-0 shadow-sm rounded-4 p-4 p-md-5 bg-white w-100"
        style={{ maxWidth: 420 }}
      >
        <div className="text-center mb-4">
          <div
            className="d-inline-flex align-items-center gap-2 fw-bold fs-5 text-white rounded-3 px-3 py-2"
            style={{ backgroundColor: "#006B3C" }}
          >
            <span style={{ fontSize: "1.1rem" }}>⏱</span>
            <span>TokTickIT</span>
          </div>
        </div>

        <h1 className="h5 text-center mb-4">Sign in to your account</h1>

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3 text-start">
            <label htmlFor="login-email" className="form-label small fw-semibold">
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="mb-3 text-start">
            <label htmlFor="login-password" className="form-label small fw-semibold">
              Password
            </label>
            <div className="input-group">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((s) => !s)}
                disabled={submitting}
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger py-2 small" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn text-white w-100 fw-semibold"
            style={{ backgroundColor: "#006B3C" }}
            disabled={submitting}
          >
            {submitting ? "Signing in…" : "Sign In"}
          </button>

          <div className="text-center mt-3">
            <button
              type="button"
              className="btn btn-link btn-sm text-muted text-decoration-none"
              title="Not available in this version"
              disabled
            >
              Forgot your password?
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
