import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { StaffDashboardPage } from "../../src/pages/staff/StaffDashboardPage.js";
import { RequesterDashboardPage } from "../../src/pages/RequesterDashboardPage.js";

const mocks = vi.hoisted(() => ({ getStaffDashboard: vi.fn(), getRequesterDashboard: vi.fn() }));
vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual<typeof import("../../src/api.js")>("../../src/api.js");
  return { ...actual, ...mocks };
});
vi.mock("../../src/context/AuthContext.js", () => ({ useAuth: () => ({ user: { id: 7, name: "Kevin Patel", role: "IT_STAFF" } }) }));

describe("Lab 4 visual style and navigation contracts", () => {
  it("STYLE-01: renders six dashboard cards with accessible non-color labels", async () => {
    mocks.getStaffDashboard.mockResolvedValue({ cards: { new: 1, open: 2, inProgress: 3, waitingForRequester: 4, myAssigned: 5, unassigned: 6 }, recentTickets: [] });
    render(<MemoryRouter><StaffDashboardPage /></MemoryRouter>);
    expect(await screen.findByText("Welcome back, Kevin Patel!")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Open queue/ })).toHaveLength(6);
    expect(screen.getByText("Waiting for Requester")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
  });

  it("STYLE-02: keeps requester dashboard actions as links with defined destinations", async () => {
    mocks.getRequesterDashboard.mockResolvedValue({ cards: { myOpenTickets: 0, waitingForRequester: 0, resolved: 0, closed: 0 }, recentTickets: [] });
    render(<MemoryRouter><RequesterDashboardPage /></MemoryRouter>);
    expect(await screen.findByText(/Welcome,/)).toBeInTheDocument();
    expect(screen.getAllByRole("link").every((link) => Boolean(link.getAttribute("href")))).toBe(true);
  });
});
