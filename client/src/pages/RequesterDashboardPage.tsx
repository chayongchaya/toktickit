import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, DashboardTicket, getRequesterDashboard, RequesterDashboard } from "../api.js";
import { useAuth } from "../context/AuthContext.js";

const empty: RequesterDashboard = {
  cards: { myOpenTickets: 0, waitingForRequester: 0, resolved: 0, closed: 0 },
  recentTickets: [],
};

const cards = [
  ["myOpenTickets", "My Open Tickets", "OPEN", "#EBF5FF"],
  ["waitingForRequester", "Waiting for Me", "WAITING_FOR_REQUESTER", "#FFF7ED"],
  ["resolved", "Resolved", "RESOLVED", "#F0FDF4"],
  ["closed", "Closed", "CLOSED", "#F3F4F6"],
] as const;

function RecentTicket({ ticket }: { ticket: DashboardTicket }) {
  return <Link to={`/tickets/${ticket.id}`} className="list-group-item list-group-item-action d-flex justify-content-between gap-3">
    <span><strong>{ticket.ticketNumber}</strong><br /><span className="text-muted">{ticket.summary}</span></span>
    <span className="text-muted small text-nowrap">{new Date(ticket.updatedAt).toLocaleDateString()}</span>
  </Link>;
}

export function RequesterDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<RequesterDashboard>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRequesterDashboard().then(setData).catch((err: unknown) => {
      setError(err instanceof ApiError && err.status === 403 ? "You are not allowed to view this dashboard." : err instanceof ApiError && err.status >= 500 ? "Unable to load your dashboard right now." : "Unable to load your dashboard.");
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="container py-4" role="status"><div className="row g-3 mb-4">{Array.from({ length: 4 }, (_, index) => <div className="col-6 col-lg-3" key={index}><div className="card border-0 shadow-sm rounded-3"><div className="card-body placeholder-glow"><span className="placeholder col-7" /><span className="placeholder col-4 placeholder-lg d-block mt-2" /></div></div></div>)}</div><p className="text-muted">Loading recent tickets...</p></div>;
  if (error) return <div className="alert alert-danger" role="alert">{error}</div>;

  return <div style={{ backgroundColor: "#F5F7F6", minHeight: "100vh" }} className="pb-5">
    <div className="container py-4" style={{ maxWidth: 1200 }}>
      <div className="mb-4"><h1 className="h4 fw-bold mb-1">Welcome, {user?.name}!</h1><p className="text-muted small mb-0">A quick view of your service requests.</p></div>
      <div className="row g-3 mb-4">
        {cards.map(([key, label, status, background]) => <div className="col-12 col-sm-6 col-lg-3" key={key}>
          <Link to={`/tickets?currentStatus=${status}`} className="card h-100 border-0 shadow-sm text-decoration-none" style={{ backgroundColor: background }}>
            <div className="card-body"><div className="text-muted small fw-semibold">{label}</div><div className="display-6 fw-bold text-dark">{data.cards[key]}</div><span className="small text-success">View tickets →</span></div>
          </Link>
        </div>)}
      </div>
      <div className="card border-0 shadow-sm mb-4"><div className="card-body"><div className="d-flex justify-content-between align-items-center"><h2 className="h6 fw-bold mb-0">My Recent Tickets</h2><Link to="/tickets" className="small text-success">View all</Link></div>
        {data.recentTickets.length === 0 ? <p className="text-muted mb-0">You have no tickets yet.</p> : <div className="list-group list-group-flush">{data.recentTickets.map((ticket) => <RecentTicket key={ticket.id} ticket={ticket} />)}</div>}
      </div></div><div className="card border-0 shadow-sm"><div className="card-body"><h2 className="h6 fw-bold">Quick Actions</h2><div className="d-flex flex-wrap gap-2"><Link to="/tickets/new" className="btn btn-success">Create Ticket</Link><Link to="/tickets" className="btn btn-outline-success">View My Tickets</Link></div></div></div>
    </div>
  </div>;
}
