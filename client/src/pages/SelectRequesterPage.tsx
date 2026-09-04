import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRequester } from "../context/RequesterContext";
import { RequesterUser } from "../api";

export const SelectRequesterPage: React.FC = () => {
  const [requesters, setRequesters] = useState<RequesterUser[]>([]);
  const [selectedId, setSelectedId] = useState<number | "">("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { currentRequester, setCurrentRequester } = useRequester();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch("/api/requesters")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load requesters");
        return res.json();
      })
      .then((data: RequesterUser[]) => {
        const activeUsers = data.filter((u) => u.isActive !== false);
        setRequesters(activeUsers);
        if (currentRequester && activeUsers.some((r) => r.id === currentRequester.id)) {
          setSelectedId(currentRequester.id);
        } else if (activeUsers.length > 0) {
          setSelectedId(activeUsers[0].id);
        }
      })
      .catch((err) => {
        console.error("Error fetching requesters:", err);
        setError("Unable to load requesters. Please verify connection.");
      })
      .finally(() => setLoading(false));
  }, [currentRequester]);

  const handleContinue = () => {
    const selected = requesters.find((r) => r.id === Number(selectedId));
    if (selected) {
      setCurrentRequester(selected);
      navigate("/tickets");
    }
  };

  return (
    <div style={{ backgroundColor: "#F5F7F6", minHeight: "100vh" }}>
      <div className="container py-3" style={{ maxWidth: 860 }}>
        <div className="small text-muted d-flex align-items-center gap-1">
          <span className="text-success">🏠</span>
          <span>&gt;</span>
          <span>Development Requester Selection</span>
        </div>
      </div>

      <div className="container pb-5" style={{ maxWidth: 650 }}>
        <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5 bg-white text-center">
          <div
            className="rounded-circle d-inline-flex align-items-center justify-content-center mx-auto mb-3"
            style={{ width: 64, height: 64, backgroundColor: "#EAF6EF", color: "#006B3C", fontSize: "1.75rem" }}
          >
            👥
          </div>

          <h2 className="h4 fw-bold text-dark mb-2">Select Development Requester</h2>
          <p className="text-muted small mb-4">
            Choose a development requester to simulate the current requester context for Lab 2.<br />
            This is for testing only and is not a login screen.
          </p>

          {loading && (
            <div className="py-4 text-muted small">Loading active requesters...</div>
          )}

          {error && (
            <div className="alert alert-danger py-2 small mb-4 text-start">{error}</div>
          )}

          {!loading && !error && requesters.length === 0 && (
            <div className="alert alert-warning py-2 small mb-4 text-start">
              No active requesters available.
            </div>
          )}

          {!loading && !error && requesters.length > 0 && (
            <div className="text-start mb-3">
              <label htmlFor="requester-select" className="form-label small fw-semibold text-dark mb-1">
                Development Requester <span className="text-danger">*</span>
              </label>
              <select
                id="requester-select"
                className="form-select form-select-lg fs-6 rounded-3 border-secondary border-opacity-25"
                value={selectedId}
                onChange={(e) => setSelectedId(Number(e.target.value))}
              >
                {requesters.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div
            className="d-flex align-items-center gap-2 p-2 px-3 rounded-3 text-start mb-4"
            style={{ backgroundColor: "#EAF6EF", border: "1px solid #D2EBD9", color: "#006B3C", fontSize: "0.85rem" }}
          >
            <span>ⓘ</span>
            <span>Only active development requesters are shown.</span>
          </div>

          <div
            className="d-flex align-items-start gap-3 p-3 rounded-3 text-start mb-4"
            style={{ backgroundColor: "#F5F7F6", border: "1px solid #E5E7EB" }}
          >
            <span style={{ fontSize: "1.25rem" }}>🛡️</span>
            <div>
              <div className="fw-semibold small text-dark">Authentication coming in Lab 3</div>
              <div className="text-muted" style={{ fontSize: "0.78rem" }}>
                In Lab 3, this selection will be replaced with secure authentication so you can access the system with your own account.
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-light border px-4 py-2 small fw-semibold text-muted"
              onClick={() => navigate("/tickets")}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn px-4 py-2 small fw-semibold text-white d-flex align-items-center gap-2"
              style={{ backgroundColor: "#006B3C" }}
              disabled={loading || requesters.length === 0}
              onClick={handleContinue}
            >
              → Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};