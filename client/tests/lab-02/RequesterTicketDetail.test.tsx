import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TicketDetailPage } from "../../src/pages/TicketDetailPage";
import { RequesterContext } from "../../src/context/RequesterContext";

// Covers: AC-01 (ticket data display), AC-03 (ownership denial must be visible and
// safe, not a crash — the UI counterpart of the backend 403/404 fix).

const requesterA = { id: 1, name: "Jennifer Anderson", email: "jennifer@example.com", isActive: true };

const renderComponent = (ticketId = "1", requester = requesterA) => {
  return render(
    <RequesterContext.Provider
      value={{
        currentRequester: requester,
        setCurrentRequester: vi.fn(),
        requesters: [requester],
        loading: false,
      }}
    >
      <MemoryRouter initialEntries={[`/tickets/${ticketId}`]}>
        <Routes>
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
        </Routes>
      </MemoryRouter>
    </RequesterContext.Provider>
  );
};

describe("Requester Ticket Detail (view mode)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading indicator before the ticket data arrives", async () => {
    let resolveFetch: (value: any) => void = () => {};
    global.fetch = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    );

    renderComponent();

    expect(screen.getByText(/Loading ticket details\.\.\./i)).toBeInTheDocument();

    resolveFetch({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 1,
          ticketNumber: "TKT-2026-000001",
          summary: "Cannot access VPN network",
          description: "Getting timeout error 504",
          category: { name: "Network" },
          relatedSystem: { name: "VPN" },
          requester: requesterA,
          requestedPriority: "HIGH",
          currentStatus: "NEW",
          createdAt: new Date().toISOString(),
          attachments: [],
        }),
    });

    await waitFor(() => {
      expect(screen.queryByText(/Loading ticket details\.\.\./i)).not.toBeInTheDocument();
    });
  });

  it("renders read-only ticket details accurately", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 1,
          ticketNumber: "TKT-2026-000001",
          summary: "Cannot access VPN network",
          description: "Getting timeout error 504",
          category: { name: "Network" },
          relatedSystem: { name: "VPN" },
          requester: requesterA,
          requestedPriority: "HIGH",
          currentStatus: "NEW",
          createdAt: new Date().toISOString(),
          attachments: [],
        }),
    });

    renderComponent("1");

    await waitFor(() => {
      expect(screen.getByDisplayValue("TKT-2026-000001")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Cannot access VPN network")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Getting timeout error 504")).toBeInTheDocument();
    });

    // Ticket header fields must be read-only, per section 8.5.
    expect(screen.getByDisplayValue("TKT-2026-000001")).toHaveAttribute("readonly");
  });

  it("shows a safe forbidden message — not a crash — when the ticket belongs to another requester", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Forbidden: You do not own this ticket" }),
    });

    renderComponent("999");

    expect(await screen.findByText(/Forbidden: You do not own this ticket/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to my tickets/i })).toBeInTheDocument();

    // Must not attempt to render ticket fields that were never returned.
    expect(screen.queryByDisplayValue(/TKT-/)).not.toBeInTheDocument();
  });

  it("shows a not-found message when the ticket id does not exist", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Ticket not found" }),
    });

    renderComponent("99999");

    expect(await screen.findByText(/Ticket not found/i)).toBeInTheDocument();
  });
});
