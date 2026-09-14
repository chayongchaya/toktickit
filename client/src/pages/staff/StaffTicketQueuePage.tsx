import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCategories, getStaffTickets, Category, Ticket, Pagination, ApiError } from "../../api.js";

const statuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];
const badge = (value: string) => <span className="badge rounded-pill px-3 py-1 fw-normal" style={{ backgroundColor: "#EAF6EF", color: "#006B3C", border: "1px solid #B7DEC6" }}>{value.replaceAll("_", " ")}</span>;
const priority = (value?: string) => <span className="badge rounded-pill px-3 py-1 fw-normal" style={{ backgroundColor: value === "HIGH" ? "#FDE8E8" : value === "MEDIUM" ? "#FEF08A" : "#DEF7EC", color: "#374151", border: "1px solid #D1D5DB" }}>{value ?? "-"}</span>;

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const owners = Array.from(new Map(tickets.map((ticket) => {
    const row = ticket as Ticket & { ownerId?: number | null; ownerName?: string | null };
    return row.ownerId && row.ownerName ? [row.ownerId, { id: row.ownerId, name: row.ownerName }] : [0, null];
  }).filter((entry): entry is [number, { id: number; name: string }] => entry[0] !== 0)).values());

  useEffect(() => { getCategories().then(setCategories).catch(() => undefined); }, []);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    getStaffTickets({ search, status, category, requestedPriority, itPriority, owner, sort, page: pagination.page, pageSize: pagination.pageSize })
      .then((result) => { if (!cancelled) { setTickets(result.data ?? []); setPagination(result.pagination); } })
      .catch((err: unknown) => { if (!cancelled) setError(err instanceof ApiError && err.status === 403 ? "You are not allowed to view the staff queue." : "Unable to load the staff ticket queue."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [search, status, category, requestedPriority, itPriority, owner, sort, pagination.page, pagination.pageSize]);

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
      <div className="col-md-4 col-lg-2"><select className="form-select form-select-sm" aria-label="Sort" value={sort} onChange={(e) => { setSort(e.target.value as typeof sort); setPagination((p) => ({ ...p, page: 1 })); }}><option value="createdAt">Newest</option><option value="updatedAt">Recently Updated</option><option value="itPriority">IT Priority</option></select></div>
    </div></div>
    {error && <div className="alert alert-danger" role="alert">{error}</div>}
    {!error && <div className="card border-0 shadow-sm rounded-3 overflow-hidden bg-white"><div className="table-responsive"><table className="table align-middle mb-0"><thead style={{ backgroundColor: "#EAF6EF" }}><tr><th>Ticket No.</th><th>Summary</th><th>Category</th><th>Requested Priority</th><th>IT Priority</th><th>Status</th><th>Owner</th></tr></thead><tbody>{loading ? <tr><td colSpan={7} className="text-center py-5">Loading tickets...</td></tr> : tickets.length === 0 ? <tr><td colSpan={7} className="text-center py-5 text-muted">{search || status || category || owner ? "No matching tickets found." : "No tickets in the queue."}</td></tr> : tickets.map((ticket) => <tr key={ticket.id}><td><Link to={`/queue/${ticket.id}`} className="fw-bold text-decoration-none" style={{ color: "#006B3C" }}>{ticket.ticketNumber}</Link></td><td>{ticket.summary}</td><td>{ticket.category?.name ?? "-"}</td><td>{priority(ticket.requestedPriority)}</td><td>{priority(ticket.itPriority)}</td><td>{badge(ticket.currentStatus)}</td><td>{(ticket as Ticket & { ownerName?: string | null }).ownerName ?? <span className="text-muted fst-italic">Unassigned</span>}</td></tr>)}</tbody></table></div><div className="d-flex justify-content-between align-items-center p-3 border-top small text-muted"><span>Showing {from} to {to} of {pagination.total} tickets</span><div className="d-flex gap-2"><button className="btn btn-sm btn-light border" disabled={pagination.page <= 1} onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}>Previous</button><span className="py-1">Page {pagination.page} of {pagination.totalPages}</span><button className="btn btn-sm btn-light border" disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}>Next</button><select className="form-select form-select-sm" aria-label="Page size" value={pagination.pageSize} onChange={(e) => setPagination({ ...pagination, page: 1, pageSize: Number(e.target.value) })}>{[5, 8, 10, 20].map((n) => <option key={n}>{n}</option>)}</select></div></div></div>}
  </div></div>;
}
