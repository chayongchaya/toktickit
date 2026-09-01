import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useRequester } from "../context/RequesterContext";
import { getCategories, type Category } from "../api";

interface TicketItem {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  currentStatus: string;
  requestedPriority: string;
  itPriority?: string;
  createdAt: string;
  updatedAt: string;
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
}

interface Pagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

type SortField = "ticketNumber" | "createdAt" | "updatedAt";

const PAGE_SIZE = 8;
const SEARCH_DEBOUNCE_MS = 350;

export const TicketListPage: React.FC = () => {
  const { currentRequester } = useRequester();

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    pageSize: PAGE_SIZE,
    totalPages: 1,
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filter states
  const [searchInput, setSearchInput] = useState(""); // ค่าที่พิมพ์ดิบๆ
  const [search, setSearch] = useState(""); // ค่าหลัง debounce ที่จะยิงจริง
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Pagination / sort state
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // --- Debounce การค้นหา ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // --- โหลด category list จาก DB จริง (แทนการ hardcode) ---
  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((err) => console.error("Failed to load categories:", err));
  }, []);

  // --- กลับไปหน้า 1 ทุกครั้งที่เงื่อนไข filter/sort เปลี่ยน ---
  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, priorityFilter, statusFilter, sortBy, sortOrder]);

  // --- ดึงข้อมูลจาก backend จริง พร้อม search/filter/sort/pagination ---
  useEffect(() => {
    if (!currentRequester) return;

    let cancelled = false;
    setLoading(true);
    setFetchError(null);

    const params: Record<string, string> = {
      requesterId: currentRequester.id.toString(),
      sortBy,
      sortOrder,
      page: currentPage.toString(),
      pageSize: PAGE_SIZE.toString(),
    };
    if (search) params.search = search;
    if (categoryFilter !== "ALL") params.categoryId = categoryFilter;
    if (priorityFilter !== "ALL") params.requestedPriority = priorityFilter;
    if (statusFilter !== "ALL") params.currentStatus = statusFilter;

    const query = new URLSearchParams(params);

    fetch(`/api/tickets?${query.toString()}`, {
      headers: { "x-requester-id": currentRequester.id.toString() },
    })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(body?.error || "Failed to load tickets.");
        }
        return body;
      })
      .then((resData) => {
        if (cancelled) return;
        setTickets(resData.data ?? resData.tickets ?? []);
        setPagination(
          resData.pagination ?? {
            total: 0,
            page: 1,
            pageSize: PAGE_SIZE,
            totalPages: 1,
          }
        );
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Error fetching tickets:", err);
        setFetchError(err.message || "Unable to load your tickets right now.");
        setTickets([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRequester, search, categoryFilter, priorityFilter, statusFilter, sortBy, sortOrder, currentPage]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const sortIndicator = (field: SortField) => {
    if (sortBy !== field) return "⇅";
    return sortOrder === "asc" ? "▲" : "▼";
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setSearch("");
    setCategoryFilter("ALL");
    setPriorityFilter("ALL");
    setStatusFilter("ALL");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    search !== "" || categoryFilter !== "ALL" || priorityFilter !== "ALL" || statusFilter !== "ALL";

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

  const startIndex = (pagination.page - 1) * pagination.pageSize;
  const showingFrom = pagination.total > 0 ? startIndex + 1 : 0;
  const showingTo = Math.min(startIndex + pagination.pageSize, pagination.total);

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
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
            </div>
            <div className="col-lg-8">
              <div className="row g-2">
                <div className="col-md-4 col-6">
                  <select
                    className="form-select form-select-sm"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="ALL">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4 col-6">
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
                <div className="col-md-4 col-6">
                  <select
                    className="form-select form-select-sm"
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
              </div>
            </div>
          </div>
        </div>

        {fetchError && (
          <div
            className="alert py-2 mb-3 small"
            style={{ backgroundColor: "#FDE8E8", color: "#9B1C1C", border: "1px solid #F8B4B4" }}
            role="alert"
          >
            ⚠️ {fetchError}
          </div>
        )}

        {/* Table Card */}
        <div className="card border-0 shadow-sm rounded-3 overflow-hidden bg-white">
          <div className="table-responsive">
            <table className="table align-middle mb-0" style={{ fontSize: "0.85rem" }}>
              <thead style={{ backgroundColor: "#EAF6EF" }}>
                <tr className="text-secondary">
                  <th
                    className="py-3 px-3 fw-semibold"
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSort("ticketNumber")}
                    onKeyDown={(e) => e.key === "Enter" && handleSort("ticketNumber")}
                    style={{ cursor: "pointer", userSelect: "none" }}
                  >
                    Ticket No. {sortIndicator("ticketNumber")}
                  </th>
                  <th
                    className="py-3 px-3 fw-semibold"
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSort("createdAt")}
                    onKeyDown={(e) => e.key === "Enter" && handleSort("createdAt")}
                    style={{ cursor: "pointer", userSelect: "none" }}
                  >
                    Created Date {sortIndicator("createdAt")}
                  </th>
                  <th className="py-3 px-3 fw-semibold">Summary</th>
                  <th className="py-3 px-3 fw-semibold">Category</th>
                  <th className="py-3 px-3 fw-semibold text-center">Requested Priority</th>
                  <th className="py-3 px-3 fw-semibold text-center">IT Priority</th>
                  <th className="py-3 px-3 fw-semibold text-center">Current Status</th>
                  <th
                    className="py-3 px-3 fw-semibold"
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSort("updatedAt")}
                    onKeyDown={(e) => e.key === "Enter" && handleSort("updatedAt")}
                    style={{ cursor: "pointer", userSelect: "none" }}
                  >
                    Last Updated {sortIndicator("updatedAt")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-5 text-muted">
                      Loading tickets...
                    </td>
                  </tr>
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-5 text-muted fst-italic">
                      {hasActiveFilters
                        ? "No matching tickets found."
                        : "No tickets found for this requester."}
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => (
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
              Showing {showingFrom} to {showingTo} of {pagination.total} tickets
            </div>
            {pagination.totalPages > 1 && (
              <div className="d-flex align-items-center gap-1">
                <button
                  className="btn btn-sm btn-light border px-2 py-0"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  &lt; Previous
                </button>
                {Array.from({ length: pagination.totalPages }, (_, i) => (
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
                  disabled={currentPage === pagination.totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
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