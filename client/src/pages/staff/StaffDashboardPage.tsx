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
  const status = ticket.currentStatus.replaceAll("_", " ");
  return <Link to={`/queue/${ticket.id}`} className="list-group-item list-group-item-action d-flex justify-content-between gap-3"><span><strong>{ticket.ticketNumber}</strong><br /><span className="text-muted">{ticket.summary}</span></span><span className="d-flex flex-column align-items-end gap-1"><span className="badge rounded-pill px-2 py-1 fw-normal bg-light text-dark border">{status}</span><span className="text-muted small text-nowrap">{new Date(ticket.updatedAt).toLocaleDateString()}</span></span></Link>;
}

export function StaffDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<StaffDashboard>(empty); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const load = () => { setLoading(true); setError(null); getStaffDashboard().then(setData).catch((err: unknown) => setError(err instanceof ApiError && err.status === 403 ? "You are not allowed to view this dashboard." : "Unable to load the staff dashboard.")).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);
  if (loading) return <div className="container py-4" role="status"><div className="row g-3 mb-4">{Array.from({ length: 6 }, (_, index) => <div className="col-6 col-lg-2" key={index}><div className="card border-0 shadow-sm rounded-3"><div className="card-body placeholder-glow"><span className="placeholder col-8" /><span className="placeholder col-5 placeholder-lg d-block mt-2" /></div></div></div>)}</div><p className="text-muted">Loading recent tickets...</p></div>;
  const href = (filter: string) => filter === "MY_ASSIGNED" ? `/queue?owner=${user?.id ?? ""}` : filter === "UNASSIGNED" ? "/queue?owner=unassigned" : `/queue?status=${filter}`;
  if (error) return <div><div className="alert alert-danger" role="alert">{error}</div><button className="btn btn-outline-success" onClick={load}>Refresh</button></div>;
  return <div style={{ backgroundColor: "#F5F7F6", minHeight: "100vh" }} className="pb-5"><div className="container py-4" style={{ maxWidth: 1200 }}>
    <div className="d-flex justify-content-between align-items-start mb-4"><div><h1 className="h4 fw-bold mb-1">Welcome back, {user?.name}!</h1><p className="text-muted small mb-0">Monitor the service desk queue and your workload.</p></div><button className="btn btn-outline-success btn-sm" onClick={load}>↻ Refresh</button></div>
    <div className="row g-3 mb-4">{cards.map(([key, label, filter]) => <div className="col-6 col-lg-2" key={key}><Link to={href(filter)} className="card h-100 border-0 shadow-sm text-decoration-none"><div className="card-body"><div className="text-muted small fw-semibold">{label}</div><div className="display-6 fw-bold text-dark">{data.cards[key]}</div><span className="small text-success">Open queue →</span></div></Link></div>)}</div>
    <div className="card border-0 shadow-sm mb-4"><div className="card-body"><div className="d-flex justify-content-between align-items-center"><h2 className="h6 fw-bold mb-0">My Recent Tickets</h2><Link to="/queue" className="small text-success">View all</Link></div>{data.recentTickets.length === 0 ? <p className="text-muted mb-0">You have no assigned tickets yet.</p> : <div className="list-group list-group-flush">{data.recentTickets.map((ticket) => <RecentTicket key={ticket.id} ticket={ticket} />)}</div>}</div></div>
    <div className="card border-0 shadow-sm"><div className="card-body"><h2 className="h6 fw-bold">Quick Actions</h2><Link to="/queue" className="btn btn-success me-2">My Queue</Link>{user?.role === "ADMINISTRATOR" && <Link to="/admin/users" className="btn btn-outline-success">Manage Users</Link>}</div></div>
  </div></div>;
}
