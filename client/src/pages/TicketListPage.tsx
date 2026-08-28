import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useRequester } from "../context/RequesterContext.js";

interface TicketItem {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  currentStatus: "NEW" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  requestedPriority: "LOW" | "MEDIUM" | "HIGH";
  createdAt: string;
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
}

export const TicketListPage: React.FC = () => {
  const { currentRequester } = useRequester();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const fetchTickets = () => {
    if (!currentRequester) return;
    setLoading(true);

    const params = new URLSearchParams({
      requesterId: currentRequester.id.toString(),
    });

    if (statusFilter !== "ALL") {
      params.append("status", statusFilter);
    }
    if (search.trim()) {
      params.append("search", search.trim());
    }

    fetch(`/api/tickets?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTickets(data);
      })
      .catch((err) => console.error("Error fetching tickets:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTickets();
  }, [currentRequester, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTickets();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "NEW":
        return <span className="badge bg-primary">New</span>;
      case "IN_PROGRESS":
        return <span className="badge bg-warning text-dark">In Progress</span>;
      case "RESOLVED":
        return <span className="badge bg-success">Resolved</span>;
      case "CLOSED":
        return <span className="badge bg-secondary">Closed</span>;
      default:
        return <span className="badge bg-light text-dark">{status}</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return <span className="badge bg-danger">High</span>;
      case "MEDIUM":
        return <span className="badge bg-info text-dark">Medium</span>;
      case "LOW":
        return <span className="badge bg-light text-dark border">Low</span>;
      default:
        return <span className="badge bg-secondary">{priority}</span>;
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 fw-bold text-success mb-1">My Tickets</h1>
          <p className="text-muted small mb-0">
            Tickets submitted by {currentRequester?.name}
          </p>
        </div>
        <Link to="/tickets/new" className="btn btn-success fw-medium">
          + Create New Ticket
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-3">
          <form onSubmit={handleSearchSubmit} className="row g-2 align-items-center">
            <div className="col-md-6">
              <input
                type="text"
                className="form-control"
                placeholder="Search by Ticket ID or Summary..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="NEW">New</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div className="col-md-2">
              <button type="submit" className="btn btn-outline-success w-100">
                Filter
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Ticket List Table */}
      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: 140 }}>Ticket ID</th>
                <th>Summary</th>
                <th>Category</th>
                <th>System</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted">
                    Loading tickets...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-muted">
                    No tickets found for this requester.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.id}>
                    <td className="fw-semibold text-secondary">{t.ticketNumber}</td>
                    <td>
                      <div className="fw-medium text-dark">{t.summary}</div>
                      <div className="text-muted small text-truncate" style={{ maxWidth: 350 }}>
                        {t.description}
                      </div>
                    </td>
                    <td>{t.category?.name || "-"}</td>
                    <td>{t.relatedSystem?.name || "-"}</td>
                    <td>{getPriorityBadge(t.requestedPriority)}</td>
                    <td>{getStatusBadge(t.currentStatus)}</td>
                    <td className="text-muted small">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};