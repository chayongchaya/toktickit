import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { StaffTicketQueuePage } from "../../src/pages/staff/StaffTicketQueuePage.js";

const { getStaffTickets, getStaffOwners } = vi.hoisted(() => ({ getStaffTickets: vi.fn(), getStaffOwners: vi.fn() }));
vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual<typeof import("../../src/api.js")>("../../src/api.js");
  return { ...actual, getCategories: vi.fn().mockResolvedValue([]), getStaffOwners, getStaffTickets };
});

const statuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];
const statusColors: Record<string, string> = {
  NEW: "rgb(243, 244, 246)", OPEN: "rgb(235, 245, 255)", IN_PROGRESS: "rgb(254, 243, 199)", WAITING_FOR_REQUESTER: "rgb(243, 232, 255)",
  RESOLVED: "rgb(222, 247, 236)", CLOSED: "rgb(229, 231, 235)", REOPENED: "rgb(255, 237, 213)", CANCELLED: "rgb(253, 232, 232)",
};

describe("Lab 3 Zen Green badge tokens", () => {
  it("renders distinct tokens for all eight statuses and priority values", async () => {
    getStaffOwners.mockResolvedValue([]);
    getStaffTickets.mockResolvedValue({
      data: statuses.map((currentStatus, index) => ({ id: index + 1, ticketNumber: `TKT-${index}`, summary: currentStatus, category: { name: "Hardware" }, requestedPriority: ["HIGH", "MEDIUM", "LOW"][index % 3], itPriority: ["HIGH", "MEDIUM", "LOW"][index % 3], currentStatus, ownerName: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" })),
      pagination: { total: 8, page: 1, pageSize: 10, totalPages: 1 },
    });
    render(<BrowserRouter><StaffTicketQueuePage /></BrowserRouter>);
    await waitFor(() => expect(screen.getAllByText("CANCELLED").length).toBeGreaterThan(0));
    for (const status of statuses) {
      expect(screen.getAllByText(status.replaceAll("_", " ")).some((element) => element.style.backgroundColor === statusColors[status])).toBe(true);
    }
    expect(screen.getAllByText("HIGH").some((element) => element.style.backgroundColor === "rgb(253, 232, 232)")).toBe(true);
    expect(screen.getAllByText("MEDIUM").some((element) => element.style.backgroundColor === "rgb(254, 240, 138)")).toBe(true);
    expect(screen.getAllByText("LOW").some((element) => element.style.backgroundColor === "rgb(222, 247, 236)")).toBe(true);
  });
});
