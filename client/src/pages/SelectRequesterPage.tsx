import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRequester, Requester } from "../context/RequesterContext.js";

export const SelectRequesterPage: React.FC = () => {
  const [requesters, setRequesters] = useState<Requester[]>([]);
  const [selectedId, setSelectedId] = useState<number | "">("");
  const { currentRequester, setCurrentRequester } = useRequester();
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/requesters")
      .then((res) => res.json())
      .then((data: Requester[]) => {
        setRequesters(data);
        if (currentRequester) {
          setSelectedId(currentRequester.id);
        } else if (data.length > 0) {
          setSelectedId(data[0].id);
        }
      })
      .catch((err) => console.error("Error fetching requesters:", err));
  }, [currentRequester]);

  const handleContinue = () => {
    const selected = requesters.find((r) => r.id === Number(selectedId));
    if (selected) {
      setCurrentRequester(selected);
      navigate("/tickets");
    }
  };

  return (
    <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light p-4">
      <div className="card shadow-sm p-4 w-100" style={{ maxWidth: 460 }}>
        <h1 className="h4 fw-bold text-success mb-2">Select Development Requester</h1>

        <div className="alert alert-warning py-2 px-3 small mb-3">
          Choose a development requester to simulate the current requester context for Lab 2. This is for testing only and is not a login screen.
        </div>

        <div className="mb-4">
          <label className="form-label text-secondary small fw-medium">
            Development Requester
          </label>
          <select
            className="form-select"
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

        <button
          onClick={handleContinue}
          className="btn btn-success w-100 fw-medium"
        >
          Continue
        </button>
      </div>
    </div>
  );
};