import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCategories, getStaffOwners, getStaffTickets, Category, Ticket, Pagination, ApiError, RequesterUser } from "../../api.js";

const statuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];
const STATUS_BADGES: Record<string, { backgroundColor: string; color: string; border: string }> = {
  NEW: { backgroundColor: "#F3F4F6", color: "#374151", border: "#E5E7EB" },
  OPEN: { backgroundColor: "#EBF5FF", color: "#1E429F", border: "#C3DDFD" },
  IN_PROGRESS: { backgroundColor: "#FEF3C7", color: "#92400E", border: "#FDE68A" },
  WAITING_FOR_REQUESTER: { backgroundColor: "#F3E8FF", color: "#6B21A8", border: "#E9D5FF" },
  RESOLVED: { backgroundColor: "#DEF7EC", color: "#03543F", border: "#BCF0DA" },
  CLOSED: { backgroundColor: "#E5E7EB", color: "#1F2937", border: "#D1D5DB" },
  REOPENED: { backgroundColor: "#FFEDD5", color: "#9A3412", border: "#FED7AA" },
  CANCELLED: { backgroundColor: "#FDE8E8", color: "#9B1C1C", border: "#F8B4B4" },
};
const badge = (value: string) => { const token = STATUS_BADGES[value] ?? STATUS_BADGES.NEW; return <span className="badge rounded-pill px-3 py-1 fw-normal" style={{ ...token, border: `1px solid ${token.border}` }}>{value.replaceAll("_", " ")}</span>; };
const priority = (value?: string) => { const token = value === "HIGH" ? { backgroundColor: "#FDE8E8", color: "#9B1C1C", border: "#F8B4B4" } : value === "MEDIUM" ? { backgroundColor: "#FEF08A", color: "#854D0E", border: "#FDE047" } : { backgroundColor: "#DEF7EC", color: "#03543F", border: "#BCF0DA" }; return <span className="badge rounded-pill px-3 py-1 fw-normal" style={{ ...token, border: `1px solid ${token.border}` }}>{value ?? "-"}</span>; };

export function StaffTicketQueuePage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, pageSize: 10, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [requestedPriority, setRequestedPriority] = useState("");
  const [itPriority, setItPriority] = useState("");
  const [owner, setOwner] = useState("");
  const [sort, setSort] = useState<"createdAt" | "updatedAt" | "itPriority">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [owners, setOwners] = useState<RequesterUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { getCategories().then(setCategories).catch(() => undefined); getStaffOwners().then(setOwners).catch(() => undefined); }, []);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    getStaffTickets({ search, status, category, requestedPriority, itPriority, owner, sort, sortOrder, page: pagination.page, pageSize: pagination.pageSize })
      .then((result) => { if (!cancelled) { setTickets(result.data ?? []); setPagination(result.pagination); } })
      .catch((err: unknown) => { if (!cancelled) setError(err instanceof ApiError && err.status === 403 ? "You are not allowed to view the staff queue." : "Unable to load the staff ticket queue."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [search, status, category, requestedPriority, itPriority, owner, sort, sortOrder, pagination.page, pagination.pageSize]);

  const resetPage = (setter: (v: string) => void) => (event: React.ChangeEvent<HTMLSelectElement>) => { setter(event.target.value); setPagination((p) => ({ ...p, page: 1 })); };
  const from = pagination.total ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const to = Math.min(pagination.page * pagination.pageSize, pagination.total);

  return <div style={{ backgroundColor: "#F5F7F6", minHeight: "100vh" }} className="pb-5"><div className="container py-4" style={{ maxWidth: 1280 }}>
    <div className="mb-4"><h1 className="h4 fw-bold mb-1">My Queue</h1><p className="text-muted small mb-0">Manage tickets assigned to the IT team.</p></div>
    <div className="card border-0 shadow-sm rounded-3 mb-4 p-3 bg-white"><div className="row g-2">
      <div className="col-lg-4"><input className="form-control form-control-sm" aria-label="Search tickets" placeholder="Search by ticket number or summary..." value={search} onChange={(e) => { setSearch(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }} /></div>
      <div className="col-md-4 col-lg-2"><select className="form-select form-select-sm" aria-label="Status" value={status} onChange={resetPage(setStatus)}><option value="">All Statuses</option>{statuses.map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}</select></div>
      <div className="col-md-4 col-lg-2"><select className="form-select form-select-sm" aria-label="Category" value={category} onChange={resetPage(setCategory)}><option value="">All Categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <div className="col-md-4 col-lg-2"><select className="form-select form-select-sm" aria-label="Requested Priority" value={requestedPriority} onChange={resetPage(setRequestedPriority)}><option value="">Requested Priority</option>{["LOW", "MEDIUM", "HIGH"].map((p) => <option key={p}>{p}</option>)}</select></div>
      <div className="col-md-4 col-lg-2"><select className="form-select form-select-sm" aria-label="IT Priority" value={itPriority} onChange={resetPage(setItPriority)}><option value="">IT Priority</option>{["LOW", "MEDIUM", "HIGH"].map((p) => <option key={p}>{p}</option>)}</select></div>
      <div className="col-md-4 col-lg-2"><select className="form-select form-select-sm" aria-label="Owner" value={owner} onChange={resetPage(setOwner)}><option value="">All Owners</option>{owners.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}<option value="unassigned">Unassigned</option></select></div>
    </div></div>
    {error && <div className="alert alert-danger" role="alert">{error}</div>}
    {!error && <div className="card border-0 shadow-sm rounded-3 overflow-hidden bg-white"><div className="table-responsive"><table className="table align-middle mb-0"><thead style={{ backgroundColor: "#EAF6EF" }}><tr>{([['ticketNumber', 'Ticket No.'], ['createdAt', 'Created'], ['updatedAt', 'Updated'], ['itPriority', 'IT Priority']] as const).map(([field, label]) => <th key={field}><button type="button" className="btn btn-link p-0 text-dark text-decoration-none fw-bold" onClick={() => { if (sort === field) setSortOrder((order) => order === "asc" ? "desc" : "asc"); else { setSort(field === "ticketNumber" ? "createdAt" : field); setSortOrder("desc"); } setPagination((p) => ({ ...p, page: 1 })); }}>{label} {sort === field ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}</button></th>)}<th>Summary</th><th>Category</th><th>Requested Priority</th><th>Status</th><th>Owner</th></tr></thead><tbody>{loading ? <tr><td colSpan={9} className="text-center py-5">Loading tickets...</td></tr> : tickets.length === 0 ? <tr><td colSpan={9} className="text-center py-5 text-muted">{search || status || category || owner ? "No matching tickets found." : "No tickets in the queue."}</td></tr> : tickets.map((ticket) => <tr key={ticket.id}><td><Link to={`/queue/${ticket.id}`} className="fw-bold text-decoration-none" style={{ color: "#006B3C" }}>{ticket.ticketNumber}</Link></td><td>{ticket.createdAt}</td><td>{ticket.updatedAt}</td><td>{priority(ticket.itPriority)}</td><td>{ticket.summary}</td><td>{ticket.category?.name ?? "-"}</td><td>{priority(ticket.requestedPriority)}</td><td>{badge(ticket.currentStatus)}</td><td>{(ticket as Ticket & { ownerName?: string | null }).ownerName ?? <span className="text-muted fst-italic">Unassigned</span>}</td></tr>)}</tbody></table></div><div className="d-flex justify-content-between align-items-center p-3 border-top small text-muted"><span>Showing {from} to {to} of {pagination.total} tickets</span><div className="d-flex gap-2"><button className="btn btn-sm btn-light border" disabled={pagination.page <= 1} onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}>Previous</button><span className="py-1">Page {pagination.page} of {pagination.totalPages}</span><button className="btn btn-sm btn-light border" disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}>Next</button><select className="form-select form-select-sm" aria-label="Page size" value={pagination.pageSize} onChange={(e) => setPagination({ ...pagination, page: 1, pageSize: Number(e.target.value) })}>{[5, 8, 10, 20].map((n) => <option key={n}>{n}</option>)}</select></div></div></div>}
  </div></div>;
}
