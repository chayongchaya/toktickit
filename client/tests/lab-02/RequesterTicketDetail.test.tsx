import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TicketDetailPage } from "../../src/pages/TicketDetailPage";

// Covers: AC-01 (ticket data display), AC-28/FR-07 (existence-hiding: a
// forged/foreign ticket id must be indistinguishable from one that plain
// does not exist).
//
// Lab 3 (BR-32/BR-03, docs/lab-03/tests.md MIG-03): the Development
// Requester selector and RequesterContext are removed, so this file mocks
// useAuth() instead of wrapping the component in RequesterContext.Provider.
//
// Lab 3 (FR-07/AC-28, specification.md §6 migration note): the ownership
// failure status code on these Lab 2 endpoints changes from 403 to 404.
// The old "Forbidden: You do not own this ticket" case is replaced with the
// same generic 404 message used for a genuinely nonexistent id, so a
// Requester can never learn that a ticket they don't own exists at all.

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

const requesterA = { id: 1, name: "Jennifer Anderson", email: "jennifer@example.com", isActive: true };

const renderComponent = (ticketId = "1") => {
  return render(
    <MemoryRouter initialEntries={[`/tickets/${ticketId}`]}>
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
};

describe("Requester Ticket Detail (view mode)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading indicator before the ticket data arrives", async () => {
    let resolveFetch: (value: any) => void = () => {};
    global.fetch = vi.fn().mockImplementation((url: string) => {
      // The comments fetch is a separate, parallel request — resolve it
      // immediately so the pending state under test reflects only the
      // ticket-detail fetch, not an unrelated comments request racing it.
      if (typeof url === "string" && url.includes("/comments")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return new Promise((resolve) => {
        resolveFetch = resolve;
      });
    });

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
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/comments")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({
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

  it("shows a safe, generic not-found message — not a crash — for a ticket owned by another requester", async () => {
    // FR-07/AC-28: a foreign ticket id must return the same 404/generic
    // message as a nonexistent one, never a distinguishing 403.
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: "Ticket not found" }),
    });

    renderComponent("999");

    expect(await screen.findByText(/Ticket not found/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to my tickets/i })).toBeInTheDocument();

    // Must not attempt to render ticket fields that were never returned.
    expect(screen.queryByDisplayValue(/TKT-/)).not.toBeInTheDocument();
  });

  it("shows the same generic not-found message when the ticket id genuinely does not exist", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: "Ticket not found" }),
    });

    renderComponent("99999");

    expect(await screen.findByText(/Ticket not found/i)).toBeInTheDocument();
  });

  it("shows a safe generic failure for a server error without leaking details", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/comments")) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ error: "database details must not leak" }) });
    });

    renderComponent("999");
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Unable to load ticket details."));
    expect(screen.queryByText("database details must not leak")).not.toBeInTheDocument();
  });
});
