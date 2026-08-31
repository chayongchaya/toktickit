import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useRequester } from "../context/RequesterContext.js";

interface TicketItem {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  currentStatus: string;
  requestedPriority: string;
  itPriority?: string;
  ticketOwner?: string;
  createdAt: string;
  updatedAt: string;
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
}

export const TicketListPage: React.FC = () => {
  const { currentRequester } = useRequester();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [itPriorityFilter, setItPriorityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const fetchTickets = () => {
    if (!currentRequester) return;
    setLoading(true);

    fetch(`/api/tickets?requesterId=${currentRequester.id}`, {
      headers: {
        "x-requester-id": currentRequester.id.toString(),
      },
    })
      .then((res) => res.json())
      .then((resData) => {
        // ดึง array จาก resData.data หรือ resData ตรงๆ
        const ticketList = Array.isArray(resData)
          ? resData
          : resData.data || resData.tickets || [];
        setTickets(ticketList);
      })
      .catch((err) => console.error("Error fetching tickets:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTickets();
  }, [currentRequester]);

  // Client-Side Instant Filtering
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // 1. Search filter (Ticket Number หรือ Summary)
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const matchNumber = t.ticketNumber?.toLowerCase().includes(query);
        const matchSummary = t.summary?.toLowerCase().includes(query);
        if (!matchNumber && !matchSummary) return false;
      }

      // 2. Category filter
      if (categoryFilter !== "ALL") {
        if (t.category?.name !== categoryFilter) return false;
      }

      // 3. Requested Priority filter
      if (priorityFilter !== "ALL") {
        if (t.requestedPriority?.toUpperCase() !== priorityFilter.toUpperCase()) {
          return false;
        }
      }

      // 4. IT Priority filter
      if (itPriorityFilter !== "ALL") {
        const itP = t.itPriority || t.requestedPriority;
        if (itP?.toUpperCase() !== itPriorityFilter.toUpperCase()) {
          return false;
        }
      }

      // 5. Status filter
      if (statusFilter !== "ALL") {
        if (t.currentStatus?.toUpperCase() !== statusFilter.toUpperCase()) {
          return false;
        }
      }

      return true;
    });
  }, [tickets, search, categoryFilter, priorityFilter, itPriorityFilter, statusFilter]);

  // เมื่อเปลี่ยนเงื่อนไขตัวกรอง ให้กลับมาที่หน้า 1
  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, priorityFilter, itPriorityFilter, statusFilter]);

  const handleClearFilters = () => {
    setSearch("");
    setCategoryFilter("ALL");
    setPriorityFilter("ALL");
    setItPriorityFilter("ALL");
    setStatusFilter("ALL");
    setCurrentPage(1);
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case "HIGH":
        return (
          <span
            className="badge rounded-pill px-3 py-1 fw-normal"
            style={{ backgroundColor: "#FDE8E8", color: "#9B1C1C", border: "1px solid #F8B4B4" }}
          >
            High
          </span>
        );
      case "MEDIUM":
        return (
          <span
            className="badge rounded-pill px-3 py-1 fw-normal"
            style={{ backgroundColor: "#FEF08A", color: "#854D0E", border: "1px solid #FDE047" }}
          >
            Medium
          </span>
        );
      case "LOW":
        return (
          <span
            className="badge rounded-pill px-3 py-1 fw-normal"
            style={{ backgroundColor: "#DEF7EC", color: "#03543F", border: "1px solid #BCF0DA" }}
          >
            Low
          </span>
        );
      default:
        return <span className="badge bg-light text-dark">{priority}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "NEW":
        return (
          <span
            className="badge rounded-pill px-3 py-1 fw-normal"
            style={{ backgroundColor: "#DEF7EC", color: "#03543F", border: "1px solid #BCF0DA" }}
          >
            New
          </span>
        );
      case "IN PROGRESS":
      case "IN_PROGRESS":
        return (
          <span
            className="badge rounded-pill px-3 py-1 fw-normal"
            style={{ backgroundColor: "#DEF7EC", color: "#03543F", border: "1px solid #BCF0DA" }}
          >
            In Progress
          </span>
        );
      case "RESOLVED":
        return (
          <span
            className="badge rounded-pill px-3 py-1 fw-normal"
            style={{ backgroundColor: "#DEF7EC", color: "#03543F", border: "1px solid #BCF0DA" }}
          >
            Resolved
          </span>
        );
      case "OPEN":
        return (
          <span
            className="badge rounded-pill px-3 py-1 fw-normal"
            style={{ backgroundColor: "#EBF5FF", color: "#1E429F", border: "1px solid #C3DDFD" }}
          >
            Open
          </span>
        );
      case "PENDING":
        return (
          <span
            className="badge rounded-pill px-3 py-1 fw-normal"
            style={{ backgroundColor: "#FEF08A", color: "#854D0E", border: "1px solid #FDE047" }}
          >
            Pending
          </span>
        );
      default:
        return <span className="badge bg-light text-dark">{status}</span>;
    }
  };

  // Pagination Slice
  const totalPages = Math.ceil(filteredTickets.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedTickets = filteredTickets.slice(startIndex, startIndex + pageSize);

  return (
    <div style={{ backgroundColor: "#F5F7F6", minHeight: "100vh" }} className="pb-5">
      <div className="container py-4" style={{ maxWidth: 1200 }}>
        {/* Header Bar */}
        <div className="d-flex justify-content-between align-items-start mb-4">
          <div>
            <h1 className="h4 fw-bold text-dark mb-1">My Tickets</h1>
            <p className="text-muted small mb-0">View and track all of your support requests.</p>
          </div>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-light border btn-sm px-3 fw-semibold text-muted d-flex align-items-center gap-1"
              onClick={handleClearFilters}
            >
              <span>🔄</span> Clear Filters
            </button>
            <Link
              to="/tickets/new"
              className="btn btn-sm px-3 fw-semibold text-white d-flex align-items-center gap-1"
              style={{ backgroundColor: "#006B3C" }}
            >
              <span>+</span> Create Ticket
            </Link>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="card border-0 shadow-sm rounded-3 mb-4 p-3 bg-white">
          <div className="row g-2 align-items-center">
            <div className="col-lg-4">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white border-end-0 text-muted">🔍</span>
                <input
                  type="text"
                  className="form-control border-start-0 ps-0"
                  placeholder="Search by ticket number or summary..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-lg-8">
              <div className="row g-2">
                <div className="col-md-3 col-6">
                  <select
                    className="form-select form-select-sm"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="ALL">All Categories</option>
                    <option value="Account and Access">Account and Access</option>
                    <option value="Hardware">Hardware</option>
                    <option value="Software">Software</option>
                    <option value="Network">Network</option>
                    <option value="Facilities">Facilities</option>
                  </select>
                </div>
                <div className="col-md-3 col-6">
                  <select
                    className="form-select form-select-sm"
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                  >
                    <option value="ALL">All Priorities</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div className="col-md-3 col-6">
                  <select
                    className="form-select form-select-sm"
                    value={itPriorityFilter}
                    onChange={(e) => setItPriorityFilter(e.target.value)}
                  >
                    <option value="ALL">IT Priorities</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div className="col-md-3 col-6">
                  <select
                    className="form-select form-select-sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="NEW">New</option>
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="card border-0 shadow-sm rounded-3 overflow-hidden bg-white">
          <div className="table-responsive">
            <table className="table align-middle mb-0" style={{ fontSize: "0.85rem" }}>
              <thead style={{ backgroundColor: "#EAF6EF" }}>
                <tr className="text-secondary">
                  <th className="py-3 px-3 fw-semibold">Ticket No. ⇅</th>
                  <th className="py-3 px-3 fw-semibold">Created Date ⇅</th>
                  <th className="py-3 px-3 fw-semibold">Summary</th>
                  <th className="py-3 px-3 fw-semibold">Category</th>
                  <th className="py-3 px-3 fw-semibold text-center">Requested Priority</th>
                  <th className="py-3 px-3 fw-semibold text-center">IT Priority</th>
                  <th className="py-3 px-3 fw-semibold text-center">Current Status</th>
                  <th className="py-3 px-3 fw-semibold">Ticket Owner</th>
                  <th className="py-3 px-3 fw-semibold">Last Updated ⇅</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-5 text-muted">
                      Loading tickets...
                    </td>
                  </tr>
                ) : paginatedTickets.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-5 text-muted fst-italic">
                      {tickets.length === 0
                        ? "No tickets found for this requester."
                        : "No matching tickets found."}
                    </td>
                  </tr>
                ) : (
                  paginatedTickets.map((t) => (
                    <tr key={t.id} className="border-bottom">
                      <td className="px-3">
                        <Link
                          to={`/tickets/${t.id}`}
                          className="fw-bold text-decoration-none"
                          style={{ color: "#006B3C" }}
                        >
                          {t.ticketNumber}
                        </Link>
                      </td>
                      <td className="px-3 text-muted">
                        {new Date(t.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-3 fw-medium text-dark">{t.summary}</td>
                      <td className="px-3 text-muted">{t.category?.name || "-"}</td>
                      <td className="px-3 text-center">{getPriorityBadge(t.requestedPriority)}</td>
                      <td className="px-3 text-center">
                        {getPriorityBadge(t.itPriority || t.requestedPriority)}
                      </td>
                      <td className="px-3 text-center">{getStatusBadge(t.currentStatus)}</td>
                      <td className="px-3 text-muted">{t.ticketOwner || "Unassigned"}</td>
                      <td className="px-3 text-muted">
                        {new Date(t.updatedAt || t.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="d-flex justify-content-between align-items-center p-3 border-top small text-muted">
            <div>
              Showing {filteredTickets.length > 0 ? startIndex + 1 : 0} to{" "}
              {Math.min(startIndex + pageSize, filteredTickets.length)} of {filteredTickets.length} tickets
            </div>
            {totalPages > 1 && (
              <div className="d-flex align-items-center gap-1">
                <button
                  className="btn btn-sm btn-light border px-2 py-0"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  &lt; Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i + 1}
                    className={`btn btn-sm px-2 py-0 ${
                      currentPage === i + 1 ? "text-white fw-semibold" : "btn-light border text-dark"
                    }`}
                    style={currentPage === i + 1 ? { backgroundColor: "#006B3C" } : {}}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  className="btn btn-sm btn-light border px-2 py-0"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next &gt;
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};