import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, DashboardTicket, getStaffDashboard, StaffDashboard } from "../../api.js";
import { useAuth } from "../../context/AuthContext.js";

const empty: StaffDashboard = { cards: { new: 0, open: 0, inProgress: 0, waitingForRequester: 0, myAssigned: 0, unassigned: 0 }, recentTickets: [] };
const cards = [
  ["new", "New", "NEW"], ["open", "Open", "OPEN"], ["inProgress", "In Progress", "IN_PROGRESS"],
  ["waitingForRequester", "Waiting for Requester", "WAITING_FOR_REQUESTER"], ["myAssigned", "My Assigned", "MY_ASSIGNED"], ["unassigned", "Unassigned", "UNASSIGNED"],
] as const;

function RecentTicket({ ticket }: { ticket: DashboardTicket }) {
  return <Link to={`/queue/${ticket.id}`} className="list-group-item list-group-item-action d-flex justify-content-between gap-3"><span><strong>{ticket.ticketNumber}</strong><br /><span className="text-muted">{ticket.summary}</span></span><span className="text-muted small text-nowrap">{new Date(ticket.updatedAt).toLocaleDateString()}</span></Link>;
}

export function StaffDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<StaffDashboard>(empty); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { getStaffDashboard().then(setData).catch((err: unknown) => setError(err instanceof ApiError && err.status === 403 ? "This dashboard is for staff only." : "Unable to load the staff dashboard.")).finally(() => setLoading(false)); }, []);
  if (loading) return <div className="text-center py-5 text-muted" role="status">Loading dashboard...</div>;
  if (error) return <div className="alert alert-danger" role="alert">{error}</div>;
  const href = (filter: string) => filter === "MY_ASSIGNED" ? `/queue?owner=${user?.id ?? ""}` : filter === "UNASSIGNED" ? "/queue?owner=unassigned" : `/queue?status=${filter}`;
  return <div style={{ backgroundColor: "#F5F7F6", minHeight: "100vh" }} className="pb-5"><div className="container py-4" style={{ maxWidth: 1200 }}>
    <div className="mb-4"><h1 className="h4 fw-bold mb-1">Staff Dashboard</h1><p className="text-muted small mb-0">Monitor the service desk queue and your workload.</p></div>
    <div className="row g-3 mb-4">{cards.map(([key, label, filter]) => <div className="col-12 col-sm-6 col-lg-4" key={key}><Link to={href(filter)} className="card h-100 border-0 shadow-sm text-decoration-none"><div className="card-body"><div className="text-muted small fw-semibold">{label}</div><div className="display-6 fw-bold text-dark">{data.cards[key]}</div><span className="small text-success">Open queue →</span></div></Link></div>)}</div>
    <div className="card border-0 shadow-sm"><div className="card-body"><h2 className="h6 fw-bold">Recently updated assigned tickets</h2>{data.recentTickets.length === 0 ? <p className="text-muted mb-0">No tickets are assigned to you.</p> : <div className="list-group list-group-flush">{data.recentTickets.map((ticket) => <RecentTicket key={ticket.id} ticket={ticket} />)}</div>}</div></div>
  </div></div>;
}
