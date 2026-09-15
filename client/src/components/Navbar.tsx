import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";

// Role Badge tokens — ui-spec.md §1.2. New in Lab 3, no Lab 2 precedent.
const ROLE_BADGE: Record<string, { label: string; bg: string; color: string; border?: string }> = {
  REQUESTER: { label: "Requester", bg: "#F3F4F6", color: "#374151", border: "#E5E7EB" },
  IT_STAFF: { label: "IT Staff", bg: "#EBF5FF", color: "#1E429F", border: "#C3DDFD" },
  ADMINISTRATOR: { label: "Administrator", bg: "#006B3C", color: "#FFFFFF" },
};

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isMyTickets = location.pathname === "/tickets" || location.pathname.startsWith("/tickets/");
  const isCreateTicket = location.pathname === "/tickets/new";
  const isQueue = location.pathname === "/queue" || location.pathname.startsWith("/queue/");
  const canUseQueue = user?.role === "IT_STAFF" || user?.role === "ADMINISTRATOR";

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate("/login", { replace: true });
  };

  const roleBadge = user ? ROLE_BADGE[user.role] : undefined;

  // Lab 3 auth-foundation scope only: the Requester nav pair below is shown
  // to everyone for now (no other destinations exist yet). Role-conditional
  // nav (🎫 My Queue for IT Staff/Administrator, ⚙️ Admin for
  // Administrator) is added in feature/lab3-staff-queue and
  // feature/lab3-admin-users respectively, once those routes exist — adding
  // the links before the pages exist would just create dead links.

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
            {canUseQueue && (
              <Link to="/queue" className={`nav-link text-white px-3 py-1 rounded-2 d-flex align-items-center gap-2 small fw-semibold ${isQueue ? "bg-black bg-opacity-25" : "opacity-75"}`} style={{ textDecoration: "none" }}>
                <span>🎫</span> <span className="d-none d-sm-inline">My Queue</span>
              </Link>
            )}
            {user?.role === "REQUESTER" && <>
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
            </>}
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
            <span className="fw-semibold d-none d-md-inline">{user?.name || "Profile"}</span>
            <span style={{ fontSize: "0.7rem" }}>∨</span>
          </button>

          {dropdownOpen && (
            <div
              className="position-absolute end-0 mt-2 bg-white rounded-3 shadow border py-2"
              style={{ width: 240, zIndex: 1050 }}
            >
              <div className="px-3 py-2 border-bottom mb-1">
                <div className="small fw-bold text-dark">{user?.name}</div>
                <div className="text-muted text-truncate mb-2" style={{ fontSize: "0.75rem" }}>
                  {user?.email}
                </div>
                {roleBadge && (
                  <span
                    className="badge rounded-pill px-2 py-1 fw-normal"
                    style={{
                      backgroundColor: roleBadge.bg,
                      color: roleBadge.color,
                      border: roleBadge.border ? `1px solid ${roleBadge.border}` : undefined,
                    }}
                  >
                    {roleBadge.label}
                  </span>
                )}
              </div>
              <button
                className="dropdown-item px-3 py-2 small text-dark d-flex align-items-center gap-2 w-100 text-start border-0 bg-transparent"
                onClick={handleLogout}
              >
                <span>🚪</span> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
