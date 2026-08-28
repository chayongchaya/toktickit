import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRequester } from "../context/RequesterContext.js";

export const Navbar: React.FC = () => {
  const { currentRequester } = useRequester();
  const navigate = useNavigate();

  return (
    <nav className="navbar navbar-expand-lg navbar-dark" style={{ backgroundColor: "#006B3C" }}>
      <div className="container-fluid px-4">
        <Link className="navbar-brand fw-bold" to="/tickets">
          TokTickIT
        </Link>

        <div className="collapse navbar-collapse show">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <Link className="nav-link text-white" to="/tickets">
                My Tickets
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link text-white" to="/tickets/new">
                Create Ticket
              </Link>
            </li>
          </ul>

          <div className="d-flex align-items-center">
            {currentRequester ? (
              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-success bg-opacity-75 text-white py-2 px-3">
                  👤 {currentRequester.name}
                </span>
                <button
                  className="btn btn-sm btn-light fw-semibold text-success"
                  onClick={() => navigate("/select-requester")}
                >
                  Change Requester
                </button>
              </div>
            ) : (
              <button
                className="btn btn-sm btn-warning fw-bold"
                onClick={() => navigate("/select-requester")}
              >
                Select Requester
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};