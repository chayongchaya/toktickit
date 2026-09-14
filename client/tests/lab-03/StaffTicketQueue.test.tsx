import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { StaffTicketQueuePage } from "../../src/pages/staff/StaffTicketQueuePage.js";

const { getStaffTickets } = vi.hoisted(() => ({ getStaffTickets: vi.fn() }));
vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual<typeof import("../../src/api.js")>("../../src/api.js");
  return { ...actual, getCategories: vi.fn().mockResolvedValue([{ id: 1, name: "Hardware" }]), getStaffTickets };
});

const response = {
  data: [{ id: 1, ticketNumber: "TKT-2026-000001", summary: "Laptop issue", category: { id: 1, name: "Hardware" }, requestedPriority: "HIGH", itPriority: "MEDIUM", currentStatus: "IN_PROGRESS", ownerId: 7, ownerName: "Kevin Patel", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }],
  pagination: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
};

describe("StaffTicketQueuePage", () => {
  beforeEach(() => { getStaffTickets.mockReset(); getStaffTickets.mockResolvedValue(response); });

  it("loads the queue and renders owner, priorities, and status", async () => {
    render(<BrowserRouter><StaffTicketQueuePage /></BrowserRouter>);
    expect(screen.getByText("Loading tickets...")).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText("TKT-2026-000001").length).toBeGreaterThan(0));
    expect(screen.getAllByText("Kevin Patel").length).toBeGreaterThan(0);
    expect(screen.getAllByText("IN PROGRESS").length).toBeGreaterThan(0);
    expect(getStaffTickets).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 10 }));
  });

  it("renders a distinct empty state", async () => {
    getStaffTickets.mockResolvedValue({ data: [], pagination: { total: 0, page: 1, pageSize: 10, totalPages: 1 } });
    render(<BrowserRouter><StaffTicketQueuePage /></BrowserRouter>);
    await waitFor(() => expect(screen.getByText("No tickets in the queue.")).toBeInTheDocument());
  });
});
