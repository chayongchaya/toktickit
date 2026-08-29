import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";

interface TicketDetail {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  currentStatus: "NEW" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  requestedPriority: "LOW" | "MEDIUM" | "HIGH";
  itPriority: "LOW" | "MEDIUM" | "HIGH";
  createdAt: string;
  updatedAt: string;
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  requester: { id: number; name: string; email: string };
  attachments: Array<{ id: number; fileName: string; fileSize: number }>;
}

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/tickets/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Ticket not found");
        }
        return res.json();
      })
      .then((data) => setTicket(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "NEW":
        return <span className="badge bg-primary px-3 py-2">New</span>;
      case "IN_PROGRESS":
        return <span className="badge bg-warning text-dark px-3 py-2">In Progress</span>;
      case "RESOLVED":
        return <span className="badge bg-success px-3 py-2">Resolved</span>;
      case "CLOSED":
        return <span className="badge bg-secondary px-3 py-2">Closed</span>;
      default:
        return <span className="badge bg-light text-dark px-3 py-2">{status}</span>;
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

  if (loading) {
    return <div className="text-center py-5 text-muted">Loading ticket details...</div>;
  }

  if (error || !ticket) {
    return (
      <div className="container py-5" style={{ maxWidth: 600 }}>
        <div className="alert alert-danger" role="alert">
          {error || "Ticket not found"}
        </div>
        <button className="btn btn-outline-secondary" onClick={() => navigate("/tickets")}>
          ← Back to My Tickets
        </button>
      </div>
    );
  }

  return (
    <div className="container py-4" style={{ maxWidth: 860 }}>
      {/* Header Bar */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Link to="/tickets" className="text-decoration-none text-muted small">
            ← Back to Tickets
          </Link>
          <h1 className="h3 fw-bold mt-1 mb-0">{ticket.summary}</h1>
          <span className="text-muted small">Ticket ID: {ticket.ticketNumber}</span>
        </div>
        <div>{getStatusBadge(ticket.currentStatus)}</div>
      </div>

      <div className="row g-4">
        {/* Left Column: Description & Attachments */}
        <div className="col-lg-8">
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-light fw-semibold">Description</div>
            <div className="card-body">
              <p className="card-text text-dark" style={{ whiteSpace: "pre-wrap", lineHeight: "1.6" }}>
                {ticket.description}
              </p>
            </div>
          </div>

          <div className="card shadow-sm border-0">
            <div className="card-header bg-light fw-semibold">Attachments</div>
            <div className="card-body">
              {ticket.attachments && ticket.attachments.length > 0 ? (
                <ul className="list-group list-group-flush">
                  {ticket.attachments.map((att) => (
                    <li key={att.id} className="list-group-item d-flex justify-content-between align-items-center px-0">
                      <span>📎 {att.fileName}</span>
                      <span className="text-muted small">{(att.fileSize / 1024).toFixed(1)} KB</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted mb-0 small">No attachments uploaded for this ticket.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Metadata Details */}
        <div className="col-lg-4">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-light fw-semibold">Ticket Information</div>
            <div className="card-body">
              <div className="mb-3">
                <label className="text-muted small d-block mb-1">Category</label>
                <span className="fw-semibold text-dark">{ticket.category?.name}</span>
              </div>

              <div className="mb-3">
                <label className="text-muted small d-block mb-1">Related System</label>
                <span className="fw-semibold text-dark">{ticket.relatedSystem?.name}</span>
              </div>

              <div className="mb-3">
                <label className="text-muted small d-block mb-1">Requested Priority</label>
                {getPriorityBadge(ticket.requestedPriority)}
              </div>

              <div className="mb-3">
                <label className="text-muted small d-block mb-1">Requester</label>
                <div className="fw-semibold text-dark">{ticket.requester?.name}</div>
                <div className="text-muted small">{ticket.requester?.email}</div>
              </div>

              <hr />

              <div className="mb-2">
                <label className="text-muted small d-block">Created At</label>
                <span className="small text-dark">{new Date(ticket.createdAt).toLocaleString()}</span>
              </div>

              <div>
                <label className="text-muted small d-block">Last Updated</label>
                <span className="small text-dark">{new Date(ticket.updatedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};