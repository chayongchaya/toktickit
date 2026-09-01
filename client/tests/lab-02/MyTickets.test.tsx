import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { TicketListPage } from "../../src/pages/TicketListPage";
import { RequesterContext } from "../../src/context/RequesterContext";

// Covers: AC-06 (search/filter/sort/pagination), AC-03 (requester isolation, UI-side),
// section 4.3 (distinct empty vs no-results states).

const requesterA = { id: 1, name: "Jennifer Anderson", email: "jennifer@example.com", isActive: true };
const requesterB = { id: 2, name: "Michael Brown", email: "michael.brown@example.com", isActive: true };

const oneTicket = {
  id: 1,
  ticketNumber: "TKT-2026-000001",
  summary: "Laptop Screen Flickering",
  category: { id: 1, name: "Hardware" },
  requestedPriority: "HIGH",
  currentStatus: "NEW",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const renderComponent = (requester = requesterA) => {
  return render(
    <RequesterContext.Provider
      value={{
        currentRequester: requester,
        setCurrentRequester: vi.fn(),
        requesters: [requesterA, requesterB],
        loading: false,
      }}
    >
      <BrowserRouter>
        <TicketListPage />
      </BrowserRouter>
    </RequesterContext.Provider>
  );
};

describe("TicketListPage (My Tickets) Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests the ticket list scoped to the current requester via the x-requester-id header", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [oneTicket] }),
    });

    renderComponent(requesterA);

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000001")).toBeInTheDocument();
    });

    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toContain(`requesterId=${requesterA.id}`);
    expect(init.headers["x-requester-id"]).toBe(String(requesterA.id));
  });

  it("displays the ticket belonging to the current requester", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [oneTicket] }),
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000001")).toBeInTheDocument();
      expect(screen.getByText("Laptop Screen Flickering")).toBeInTheDocument();
    });
  });

  it("shows a distinct empty-list message when the requester has no tickets at all", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/No tickets found for this requester\./i)).toBeInTheDocument();
    });
  });

  it("shows a distinct no-results message when filters exclude every existing ticket", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [oneTicket] }),
    });

    renderComponent();

    await waitFor(() => expect(screen.getByText("TKT-2026-000001")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/search by ticket number or summary/i), {
      target: { value: "nonexistent-search-term" },
    });

    await waitFor(() => {
      expect(screen.getByText(/No matching tickets found\./i)).toBeInTheDocument();
      // Must not be confused with the "no tickets at all" empty state.
      expect(screen.queryByText(/No tickets found for this requester\./i)).not.toBeInTheDocument();
    });
  });

  it("filters the visible rows instantly as the requester types a search term", async () => {
    const secondTicket = {
      ...oneTicket,
      id: 2,
      ticketNumber: "TKT-2026-000002",
      summary: "Cannot connect to VPN",
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [oneTicket, secondTicket] }),
    });

    renderComponent();

    await waitFor(() => expect(screen.getByText("TKT-2026-000001")).toBeInTheDocument());
    expect(screen.getByText("TKT-2026-000002")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/search by ticket number or summary/i), {
      target: { value: "VPN" },
    });

    await waitFor(() => {
      expect(screen.queryByText("TKT-2026-000001")).not.toBeInTheDocument();
      expect(screen.getByText("TKT-2026-000002")).toBeInTheDocument();
    });
  });

  it("re-fetches and no longer shows Requester A's tickets after switching to Requester B", async () => {
    global.fetch = vi.fn().mockImplementation((_url: string, init: any) => {
      const headerId = init?.headers?.["x-requester-id"];
      if (headerId === String(requesterA.id)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [oneTicket] }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });

    const { rerender } = render(
      <RequesterContext.Provider
        value={{
          currentRequester: requesterA,
          setCurrentRequester: vi.fn(),
          requesters: [requesterA, requesterB],
          loading: false,
        }}
      >
        <BrowserRouter>
          <TicketListPage />
        </BrowserRouter>
      </RequesterContext.Provider>
    );

    await waitFor(() => expect(screen.getByText("TKT-2026-000001")).toBeInTheDocument());

    rerender(
      <RequesterContext.Provider
        value={{
          currentRequester: requesterB,
          setCurrentRequester: vi.fn(),
          requesters: [requesterA, requesterB],
          loading: false,
        }}
      >
        <BrowserRouter>
          <TicketListPage />
        </BrowserRouter>
      </RequesterContext.Provider>
    );

    await waitFor(() => {
      expect(screen.queryByText("TKT-2026-000001")).not.toBeInTheDocument();
      expect(screen.getByText(/No tickets found for this requester\./i)).toBeInTheDocument();
    });
  });

  it("does not render a Ticket Owner column (out of scope for Lab 2)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [oneTicket] }),
    });

    renderComponent();

    await waitFor(() => expect(screen.getByText("TKT-2026-000001")).toBeInTheDocument());
    expect(screen.queryByText(/Ticket Owner/i)).not.toBeInTheDocument();
  });
});
