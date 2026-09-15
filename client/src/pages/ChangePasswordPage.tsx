import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { changePassword, ApiError } from "../api.js";

// Mirrors server/src/lib/password.ts's validatePasswordPolicy exactly, so
// the live checklist never disagrees with what the backend will accept.
function evaluatePolicy(password: string) {
  return {
    length: password.length >= 8,
    upperLower: /[a-z]/.test(password) && /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

export const ChangePasswordPage: React.FC = () => {
  const { user, markPasswordChanged, logout } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const policy = useMemo(() => evaluatePolicy(newPassword), [newPassword]);
  const policyPassed = policy.length && policy.upperLower && policy.number && policy.special;
  const confirmMatches = confirmPassword.length > 0 && confirmPassword === newPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldError(null);

    if (!policyPassed) {
      setFieldError("Please meet all password requirements below.");
      return;
    }
    if (!confirmMatches) {
      setFieldError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      markPasswordChanged();
      navigate("/tickets", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.field === "newPassword") {
        setFieldError(err.message);
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const PolicyRow: React.FC<{ ok: boolean; label: string }> = ({ ok, label }) => (
    <div className={`small ${ok ? "" : "text-muted"}`} style={{ color: ok ? "#16A34A" : undefined }}>
      {ok ? "✓" : "–"} {label}
    </div>
  );

  return (
    <div className="d-flex justify-content-center align-items-start align-items-md-center min-vh-100 bg-light py-5 px-3">
      <div
        className="card border-0 shadow-sm rounded-4 p-4 p-md-5 bg-white w-100"
        style={{ maxWidth: 420 }}
      >
        <h1 className="h5 mb-1">Change Your Password</h1>
        <p className="text-muted small mb-4">
          You must change your password to continue{user ? `, ${user.name}` : ""}.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3 text-start">
            <label htmlFor="current-password" className="form-label small fw-semibold">
              Current (temporary) password
            </label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              className="form-control"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="mb-3 text-start">
            <label htmlFor="new-password" className="form-label small fw-semibold">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              className={`form-control ${fieldError && !policyPassed ? "is-invalid" : ""}`}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="mb-3 text-start">
            <label htmlFor="confirm-password" className="form-label small fw-semibold">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              className={`form-control ${fieldError && !confirmMatches ? "is-invalid" : ""}`}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="rounded-3 p-3 mb-3" style={{ backgroundColor: "#F0FDF4" }}>
            <div className="small fw-semibold mb-1">Password must:</div>
            <PolicyRow ok={policy.length} label="Be at least 8 characters" />
            <PolicyRow ok={policy.upperLower} label="Include upper and lower case letters" />
            <PolicyRow ok={policy.number} label="Include a number" />
            <PolicyRow ok={policy.special} label="Include a special character" />
          </div>

          {fieldError && (
            <div className="alert alert-danger py-2 small" role="alert">
              {fieldError}
            </div>
          )}
          {error && (
            <div className="alert alert-danger py-2 small" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn text-white w-100 fw-semibold mb-2"
            style={{ backgroundColor: "#006B3C" }}
            disabled={submitting || !policyPassed || !confirmMatches}
          >
            {submitting ? "Saving…" : "Continue"}
          </button>

          <button
            type="button"
            className="btn btn-link btn-sm w-100 text-muted text-decoration-none"
            onClick={() => logout()}
            disabled={submitting}
          >
            Cancel and log out
          </button>
        </form>
      </div>
    </div>
  );
};
