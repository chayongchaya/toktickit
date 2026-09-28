import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { StaffDashboardPage } from "../../src/pages/staff/StaffDashboardPage.js";

const { getStaffDashboard } = vi.hoisted(() => ({ getStaffDashboard: vi.fn() }));
vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual<typeof import("../../src/api.js")>("../../src/api.js");
  return { ...actual, getStaffDashboard };
});
vi.mock("../../src/context/AuthContext.js", () => ({ useAuth: () => ({ user: { id: 7, name: "Kevin Patel", role: "IT_STAFF" } }) }));

describe("Staff dashboard", () => {
  it("UI-11: renders queue cards and ownership drill-down links", async () => {
    getStaffDashboard.mockResolvedValue({ cards: { new: 1, open: 2, inProgress: 3, waitingForRequester: 4, myAssigned: 5, unassigned: 6 }, recentTickets: [] });
    render(<MemoryRouter><StaffDashboardPage /></MemoryRouter>);
    expect(await screen.findByText("Staff Dashboard")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Open queue/ })[4]).toHaveAttribute("href", "/queue?owner=7");
  });

  it("UI-12: shows a loading state before the dashboard response", () => {
    getStaffDashboard.mockReturnValue(new Promise(() => undefined));
    render(<MemoryRouter><StaffDashboardPage /></MemoryRouter>);
    expect(screen.getByRole("status")).toHaveTextContent("Loading dashboard");
  });
});
