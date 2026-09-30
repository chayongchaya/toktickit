import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { RequesterDashboardPage } from "../../src/pages/RequesterDashboardPage.js";

const { getRequesterDashboard } = vi.hoisted(() => ({ getRequesterDashboard: vi.fn() }));
vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual<typeof import("../../src/api.js")>("../../src/api.js");
  return { ...actual, getRequesterDashboard };
});
vi.mock("../../src/context/AuthContext.js", () => ({ useAuth: () => ({ user: { id: 2, name: "Jennifer Anderson", role: "REQUESTER" } }) }));

describe("Requester dashboard", () => {
  it("UI-09: renders database-backed cards and ticket links", async () => {
    getRequesterDashboard.mockResolvedValue({ cards: { myOpenTickets: 3, waitingForRequester: 2, resolved: 1, closed: 4 }, recentTickets: [{ id: 9, ticketNumber: "TKT-2026-000009", summary: "VPN issue", currentStatus: "OPEN", updatedAt: "2026-01-01T00:00:00.000Z" }] });
    render(<MemoryRouter><RequesterDashboardPage /></MemoryRouter>);
    expect(await screen.findByText(/Welcome,/)).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /TKT-2026-000009/ })).toHaveAttribute("href", "/tickets/9");
    expect(screen.getAllByRole("link", { name: /View tickets/ })[0]).toHaveAttribute("href", "/tickets?currentStatus=OPEN");
  });

  it("UI-10: displays an empty state without failing", async () => {
    getRequesterDashboard.mockResolvedValue({ cards: { myOpenTickets: 0, waitingForRequester: 0, resolved: 0, closed: 0 }, recentTickets: [] });
    render(<MemoryRouter><RequesterDashboardPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText("You have no tickets yet.")).toBeInTheDocument());
  });
});
