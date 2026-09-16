import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { StaffTicketQueuePage } from "../../src/pages/staff/StaffTicketQueuePage.js";
import { ApiError } from "../../src/api.js";

const { getStaffTickets, getStaffOwners } = vi.hoisted(() => ({ getStaffTickets: vi.fn(), getStaffOwners: vi.fn() }));
vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual<typeof import("../../src/api.js")>("../../src/api.js");
  return { ...actual, getCategories: vi.fn().mockResolvedValue([{ id: 1, name: "Hardware" }]), getStaffOwners, getStaffTickets };
});

const response = {
  data: [{ id: 1, ticketNumber: "TKT-2026-000001", summary: "Laptop issue", category: { id: 1, name: "Hardware" }, requestedPriority: "HIGH", itPriority: "MEDIUM", currentStatus: "IN_PROGRESS", ownerId: 7, ownerName: "Kevin Patel", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }],
  pagination: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
};

describe("StaffTicketQueuePage", () => {
  beforeEach(() => { getStaffTickets.mockReset(); getStaffOwners.mockReset(); getStaffOwners.mockResolvedValue([{ id: 7, name: "Kevin Patel", email: "kevin@example.com" }]); getStaffTickets.mockResolvedValue(response); });

  it("loads the queue and renders owner, priorities, and status", async () => {
    render(<BrowserRouter><StaffTicketQueuePage /></BrowserRouter>);
    expect(screen.getAllByText("Loading tickets...").length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.getAllByText("TKT-2026-000001").length).toBeGreaterThan(0));
    expect(screen.getAllByText("Kevin Patel").length).toBeGreaterThan(0);
    expect(screen.getAllByText("IN PROGRESS").length).toBeGreaterThan(0);
    expect(getStaffTickets).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 10 }));
    expect(screen.getByTestId("ticket-card-list")).toBeInTheDocument();
    expect(screen.getByTestId("ticket-card")).toBeInTheDocument();
  });

  it("renders a distinct empty state", async () => {
    getStaffTickets.mockResolvedValue({ data: [], pagination: { total: 0, page: 1, pageSize: 10, totalPages: 1 } });
    render(<BrowserRouter><StaffTicketQueuePage /></BrowserRouter>);
    await waitFor(() => expect(screen.getAllByText("No tickets in the queue.").length).toBeGreaterThan(0));
  });

  it("refetches with search and combined filter parameters", async () => {
    render(<BrowserRouter><StaffTicketQueuePage /></BrowserRouter>);
    await waitFor(() => expect(getStaffTickets).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText("Search tickets"), { target: { value: "VPN" } });
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "OPEN" } });
    fireEvent.change(screen.getByLabelText("Requested Priority"), { target: { value: "HIGH" } });
    await waitFor(() => expect(getStaffTickets).toHaveBeenLastCalledWith(expect.objectContaining({ search: "VPN", status: "OPEN", requestedPriority: "HIGH", page: 1 })));
  });

  it("sorts by created date and toggles the sort direction", async () => {
    render(<BrowserRouter><StaffTicketQueuePage /></BrowserRouter>);
    await waitFor(() => expect(getStaffTickets).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: /Created/ }));
    await waitFor(() => expect(getStaffTickets).toHaveBeenLastCalledWith(expect.objectContaining({ sort: "createdAt", sortOrder: "asc", page: 1 })));
    fireEvent.click(screen.getByRole("button", { name: /Created/ }));
    await waitFor(() => expect(getStaffTickets).toHaveBeenLastCalledWith(expect.objectContaining({ sort: "createdAt", sortOrder: "desc", page: 1 })));
  });

  it("requests the next page and selected page size", async () => {
    getStaffTickets.mockResolvedValue({ ...response, pagination: { total: 25, page: 1, pageSize: 10, totalPages: 3 } });
    render(<BrowserRouter><StaffTicketQueuePage /></BrowserRouter>);
    await waitFor(() => expect(screen.getByText("Page 1 of 3")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(getStaffTickets).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, pageSize: 10 })));
    fireEvent.change(screen.getByLabelText("Page size"), { target: { value: "20" } });
    await waitFor(() => expect(getStaffTickets).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, pageSize: 20 })));
  });

  it("distinguishes no-results from an empty queue", async () => {
    getStaffTickets.mockResolvedValue({ data: [], pagination: { total: 0, page: 1, pageSize: 10, totalPages: 1 } });
    render(<BrowserRouter><StaffTicketQueuePage /></BrowserRouter>);
    await waitFor(() => expect(screen.getAllByText("No tickets in the queue.").length).toBeGreaterThan(0));
    fireEvent.change(screen.getByLabelText("Search tickets"), { target: { value: "missing" } });
    await waitFor(() => expect(screen.getAllByText("No matching tickets found.").length).toBeGreaterThan(0));
  });

  it("renders safe forbidden and server failure messages", async () => {
    getStaffTickets.mockRejectedValueOnce(new ApiError("Forbidden", 403));
    render(<BrowserRouter><StaffTicketQueuePage /></BrowserRouter>);
    await waitFor(() => expect(screen.getByText("You are not allowed to view the staff queue.")).toBeInTheDocument());

    getStaffTickets.mockReset();
    getStaffTickets.mockRejectedValue(new ApiError("internal details must not leak", 500));
    render(<BrowserRouter><StaffTicketQueuePage /></BrowserRouter>);
    await waitFor(() => expect(screen.getAllByText("Unable to load the staff ticket queue.").length).toBeGreaterThan(0));
    expect(screen.queryByText("internal details must not leak")).not.toBeInTheDocument();
  });
});
