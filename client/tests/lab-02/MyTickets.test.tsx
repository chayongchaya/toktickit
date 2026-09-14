import { render, screen, within, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { TicketListPage } from "../../src/pages/TicketListPage";

// Covers: AC-06 (search/filter/sort/pagination — server-driven, not client-side
// slicing), section 4.3 (distinct empty vs no-results states).
//
// Lab 3 (BR-32/BR-03, docs/lab-03/tests.md MIG-03): the Development Requester
// selector and RequesterContext are removed, so this file mocks useAuth()
// instead of wrapping the component in RequesterContext.Provider. There is
// no more x-requester-id header or requesterId query param — the session
// cookie (credentials: "include") is the only identity signal the client
// sends, and the server derives "my tickets" from the session. The old
// "switch between two requesters" test is removed entirely: there is no
// client-side requester-switching UI any more (BR-32 requires it be fully
// removed), so that scenario cannot be exercised from this component.
//
// NOTE (unchanged from Lab 2): TicketListPage renders two parallel views of
// the same data — a desktop/tablet <table> (`d-none d-md-block`) and a
// mobile card list (`d-md-none`, data-testid "ticket-card-list"). jsdom does
// not evaluate CSS media queries, so both are present in the DOM at once
// during tests even though only one is visible in a real browser. These
// tests assert against the desktop table, so ticket-row assertions are
// scoped with `within(tableView())` to avoid "multiple elements found"
// errors from the duplicate card markup.

const { mockUser } = vi.hoisted(() => ({
  mockUser: {
    id: 1,
    name: "Jennifer Anderson",
    email: "jennifer@example.com",
    role: "REQUESTER",
    mustChangePassword: false,
  },
}));

vi.mock("../../src/context/AuthContext.js", () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    markPasswordChanged: vi.fn(),
  }),
}));

const mockCategories = [
  { id: 1, name: "Hardware" },
  { id: 2, name: "Network" },
];

const oneTicket = {
  id: 1,
  ticketNumber: "TKT-2026-000001",
  summary: "Laptop Screen Flickering",
  category: { id: 1, name: "Hardware" },
  requestedPriority: "HIGH",
  currentStatus: "NEW",
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-01T10:00:00.000Z",
};

const secondTicket = {
  id: 2,
  ticketNumber: "TKT-2026-000002",
  summary: "Cannot connect to VPN",
  category: { id: 2, name: "Network" },
  requestedPriority: "MEDIUM",
  currentStatus: "OPEN",
  createdAt: "2026-01-02T10:00:00.000Z",
  updatedAt: "2026-01-02T10:00:00.000Z",
};

type MockFetchResult = {
  ok: boolean;
  json: () => Promise<any>;
};

function toUrlString(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url; // Request object
}

/**
 * Builds a fetch mock that behaves like the real backend for /api/tickets:
 * applies search/categoryId/requestedPriority/currentStatus/sortBy/sortOrder/page/pageSize
 * from the query string, and returns { data, pagination } for the session's
 * own tickets (identity comes from the mocked session, not a client param).
 */
function makeFetchMock(source: any[]) {
  const impl = (input: RequestInfo | URL): Promise<MockFetchResult> => {
    const url = toUrlString(input);

    if (url.includes("/api/categories")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCategories) });
    }

    const parsed = new URL(url, "http://localhost");
    const params = parsed.searchParams;

    let rows = [...source];

    const search = params.get("search");
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (t) => t.ticketNumber.toLowerCase().includes(q) || t.summary.toLowerCase().includes(q)
      );
    }

    const categoryId = params.get("categoryId");
    if (categoryId) rows = rows.filter((t) => String(t.category.id) === categoryId);

    const requestedPriority = params.get("requestedPriority");
    if (requestedPriority) rows = rows.filter((t) => t.requestedPriority === requestedPriority);

    const currentStatus = params.get("currentStatus");
    if (currentStatus) rows = rows.filter((t) => t.currentStatus === currentStatus);

    const sortBy = (params.get("sortBy") || "createdAt") as keyof typeof oneTicket;
    const sortOrder = params.get("sortOrder") || "desc";
    rows = [...rows].sort((a, b) => {
      if (a[sortBy] < b[sortBy]) return sortOrder === "asc" ? -1 : 1;
      if (a[sortBy] > b[sortBy]) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    const page = Number(params.get("page") || "1");
    const pageSize = Number(params.get("pageSize") || "8");
    const total = rows.length;
    const start = (page - 1) * pageSize;
    const paged = rows.slice(start, start + pageSize);

    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          data: paged,
          pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 },
        }),
    });
  };

  return vi.fn(impl) as unknown as typeof fetch;
}

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <TicketListPage />
    </BrowserRouter>
  );
};

// Helper: grab the most recent call that actually hit the tickets endpoint
// (mount also fires a request to /api/categories, which we don't care about here).
const lastTicketsCall = (fetchMock: any) =>
  fetchMock.mock.calls.filter((c: any[]) => toUrlString(c[0]).includes("/api/tickets")).at(-1);

const lastTicketsUrl = (fetchMock: any) => toUrlString(lastTicketsCall(fetchMock)[0]);

// Scope assertions to the desktop table view (see NOTE at top of file) so they
// don't collide with the parallel mobile card list that jsdom also renders.
const tableView = () => screen.getByTestId("ticket-table-view");

describe("TicketListPage (My Tickets) Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests the ticket list using the session cookie, with no client-supplied requester id", async () => {
    global.fetch = makeFetchMock([oneTicket]);

    renderComponent();

    await waitFor(() => {
      expect(within(tableView()).getByText("TKT-2026-000001")).toBeInTheDocument();
    });

    const call = lastTicketsCall(global.fetch);
    const url = toUrlString(call[0]);
    const init = call[1];
    // BR-03: identity comes from the session cookie only — no requesterId
    // query param and no x-requester-id header exist any more.
    expect(url).not.toContain("requesterId=");
    expect(init.headers?.["x-requester-id"]).toBeUndefined();
    expect(init.credentials).toBe("include");
  });

  it("sends page and pageSize to the backend instead of slicing tickets on the client", async () => {
    global.fetch = makeFetchMock([oneTicket]);

    renderComponent();

    await waitFor(() => expect(within(tableView()).getByText("TKT-2026-000001")).toBeInTheDocument());

    const url = lastTicketsUrl(global.fetch);
    expect(url).toContain("page=1");
    expect(url).toContain("pageSize=8");
  });

  it("displays the tickets belonging to the authenticated session", async () => {
    global.fetch = makeFetchMock([oneTicket]);

    renderComponent();

    await waitFor(() => {
      expect(within(tableView()).getByText("TKT-2026-000001")).toBeInTheDocument();
      expect(within(tableView()).getByText("Laptop Screen Flickering")).toBeInTheDocument();
    });
  });

  it("shows a distinct empty-list message when the requester has no tickets at all", async () => {
    global.fetch = makeFetchMock([]);

    renderComponent();

    await waitFor(() => {
      expect(within(tableView()).getByText(/No tickets found for this requester\./i)).toBeInTheDocument();
    });
  });

  it("shows a distinct no-results message when filters exclude every existing ticket", async () => {
    global.fetch = makeFetchMock([oneTicket]);

    renderComponent();

    await waitFor(() => expect(within(tableView()).getByText("TKT-2026-000001")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/search by ticket number or summary/i), {
      target: { value: "nonexistent-search-term" },
    });

    // Search is debounced (350ms) before it's sent to the backend.
    await waitFor(
      () => {
        expect(within(tableView()).getByText(/No matching tickets found\./i)).toBeInTheDocument();
        expect(
          within(tableView()).queryByText(/No tickets found for this requester\./i)
        ).not.toBeInTheDocument();
      },
      { timeout: 1500 }
    );
  });

  it("sends the debounced search term to the backend and re-renders only matching tickets", async () => {
    global.fetch = makeFetchMock([oneTicket, secondTicket]);

    renderComponent();

    await waitFor(() => expect(within(tableView()).getByText("TKT-2026-000001")).toBeInTheDocument());
    expect(within(tableView()).getByText("TKT-2026-000002")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/search by ticket number or summary/i), {
      target: { value: "VPN" },
    });

    await waitFor(
      () => {
        expect(within(tableView()).queryByText("TKT-2026-000001")).not.toBeInTheDocument();
        expect(within(tableView()).getByText("TKT-2026-000002")).toBeInTheDocument();
      },
      { timeout: 1500 }
    );

    const url = lastTicketsUrl(global.fetch);
    expect(url).toContain("search=VPN");
  });

  it("filters by category via a backend request rather than a hardcoded option list", async () => {
    global.fetch = makeFetchMock([oneTicket, secondTicket]);

    renderComponent();

    await waitFor(() => expect(within(tableView()).getByText("TKT-2026-000001")).toBeInTheDocument());

    // Category options come from GET /api/categories, not a static list.
    expect(screen.getByRole("option", { name: "Hardware" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Network" })).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue("All Categories"), {
      target: { value: "2" }, // Network
    });

    await waitFor(() => {
      expect(within(tableView()).queryByText("TKT-2026-000001")).not.toBeInTheDocument();
      expect(within(tableView()).getByText("TKT-2026-000002")).toBeInTheDocument();
    });

    const url = lastTicketsUrl(global.fetch);
    expect(url).toContain("categoryId=2");
  });

  it("sends sortBy/sortOrder to the backend and toggles direction when a sortable header is clicked", async () => {
    global.fetch = makeFetchMock([oneTicket]);

    renderComponent();
    await waitFor(() => expect(within(tableView()).getByText("TKT-2026-000001")).toBeInTheDocument());

    // Default sort on mount: createdAt desc.
    let url = lastTicketsUrl(global.fetch);
    expect(url).toContain("sortBy=createdAt");
    expect(url).toContain("sortOrder=desc");

    fireEvent.click(screen.getByRole("button", { name: /ticket no\./i }));
    await waitFor(() => {
      const lastUrl = lastTicketsUrl(global.fetch);
      expect(lastUrl).toContain("sortBy=ticketNumber");
      expect(lastUrl).toContain("sortOrder=desc");
    });

    fireEvent.click(screen.getByRole("button", { name: /ticket no\./i }));
    await waitFor(() => {
      const lastUrl = lastTicketsUrl(global.fetch);
      expect(lastUrl).toContain("sortBy=ticketNumber");
      expect(lastUrl).toContain("sortOrder=asc");
    });
  });

  it("renders backend-driven pagination controls and requests the next page on click", async () => {
    // 12 tickets total, pageSize 8 -> 2 pages.
    const manyTickets = Array.from({ length: 12 }, (_, i) => ({
      ...oneTicket,
      id: i + 1,
      ticketNumber: `TKT-2026-0000${(i + 1).toString().padStart(2, "0")}`,
      createdAt: new Date(2026, 0, i + 1).toISOString(),
    }));
    global.fetch = makeFetchMock(manyTickets);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Showing 1 to 8 of 12 tickets/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => {
      const lastUrl = lastTicketsUrl(global.fetch);
      expect(lastUrl).toContain("page=2");
    });

    await waitFor(() => {
      expect(screen.getByText(/Showing 9 to 12 of 12 tickets/i)).toBeInTheDocument();
    });
  });

  it("shows a safe error message when the tickets request fails", async () => {
    const impl = (input: RequestInfo | URL): Promise<MockFetchResult> => {
      const url = toUrlString(input);
      if (url.includes("/api/categories")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCategories) });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: "Unable to load your tickets right now." }),
      });
    };
    global.fetch = vi.fn(impl) as unknown as typeof fetch;

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Unable to load your tickets right now\./i)).toBeInTheDocument();
    });
  });

  it("does not render a Ticket Owner column (out of scope for the Requester's own view)", async () => {
    global.fetch = makeFetchMock([oneTicket]);

    renderComponent();

    await waitFor(() => expect(within(tableView()).getByText("TKT-2026-000001")).toBeInTheDocument());
    expect(screen.queryByText(/Ticket Owner/i)).not.toBeInTheDocument();
  });
});
