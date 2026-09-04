import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useRequester } from "../context/RequesterContext.js";

export const Navbar: React.FC = () => {
  const { currentRequester, setCurrentRequester } = useRequester();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isMyTickets = location.pathname === "/tickets" || location.pathname.startsWith("/tickets/");
  const isCreateTicket = location.pathname === "/tickets/new";

  const handleSwitchRequester = () => {
    setCurrentRequester(null);
    navigate("/select-requester");
  };

  return (
    <nav className="navbar navbar-expand px-3 px-md-4 py-2 sticky-top" style={{ backgroundColor: "#006B3C" }}>
      <div className="container-fluid d-flex justify-content-between align-items-center">
        {/* Brand & Links */}
        <div className="d-flex align-items-center gap-3 gap-md-4">
          <Link to="/tickets" className="navbar-brand text-white fw-bold d-flex align-items-center gap-2 m-0 fs-5">
            <span style={{ fontSize: "1.25rem" }}>⏱</span>
            <span>TokTickIT</span>
          </Link>

          <div className="d-flex align-items-center gap-2">
            <Link
              to="/tickets"
              className={`nav-link text-white px-3 py-1 rounded-2 d-flex align-items-center gap-2 small fw-semibold ${
                isMyTickets && !isCreateTicket ? "bg-black bg-opacity-25" : "opacity-75"
              }`}
              style={{ textDecoration: "none" }}
            >
              <span>📄</span> <span className="d-none d-sm-inline">My Tickets</span>
            </Link>

            <Link
              to="/tickets/new"
              className={`nav-link text-white px-3 py-1 rounded-2 d-flex align-items-center gap-2 small fw-semibold ${
                isCreateTicket ? "bg-black bg-opacity-25" : "opacity-75"
              }`}
              style={{ textDecoration: "none" }}
            >
              <span>➕</span> <span className="d-none d-sm-inline">Create Ticket</span>
            </Link>
          </div>
        </div>

        {/* Profile Dropdown */}
        <div className="position-relative">
          <button
            className="btn text-white d-flex align-items-center gap-2 border-0 small px-2 py-1"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{ backgroundColor: "transparent" }}
          >
            <div
              className="rounded-circle d-flex align-items-center justify-content-center bg-white text-dark"
              style={{ width: 28, height: 28, fontSize: "0.85rem" }}
            >
              👤
            </div>
            <span className="fw-semibold d-none d-md-inline">{currentRequester?.name || "Profile"}</span>
            <span style={{ fontSize: "0.7rem" }}>∨</span>
          </button>

          {dropdownOpen && (
            <div
              className="position-absolute end-0 mt-2 bg-white rounded-3 shadow border py-2"
              style={{ width: 230, zIndex: 1050 }}
            >
              <div className="px-3 py-2 border-bottom mb-1">
                <div className="small fw-bold text-dark">{currentRequester?.name}</div>
                <div className="text-muted text-truncate" style={{ fontSize: "0.75rem" }}>
                  {currentRequester?.email}
                </div>
              </div>
              <button
                className="dropdown-item px-3 py-2 small text-dark d-flex align-items-center gap-2 w-100 text-start border-0 bg-transparent"
                onClick={handleSwitchRequester}
              >
                <span>🔄</span> Change Requester
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};