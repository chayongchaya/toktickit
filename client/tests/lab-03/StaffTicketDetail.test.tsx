import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { StaffTicketDetailPage } from "../../src/pages/staff/StaffTicketDetailPage.js";

const { getStaffTicket, getStaffOwners, getInternalNotes, getPublicComments, postInternalNote, postPublicComment, updateStaffTicketOwner, updateStaffTicketPriority, updateStaffTicketStatus } = vi.hoisted(() => ({ getStaffTicket: vi.fn(), getStaffOwners: vi.fn(), getInternalNotes: vi.fn(), getPublicComments: vi.fn(), postInternalNote: vi.fn(), postPublicComment: vi.fn(), updateStaffTicketOwner: vi.fn(), updateStaffTicketPriority: vi.fn(), updateStaffTicketStatus: vi.fn() }));
vi.mock("../../src/api.js", async () => { const actual = await vi.importActual<typeof import("../../src/api.js")>("../../src/api.js"); return { ...actual, getStaffTicket, getStaffOwners, getInternalNotes, getPublicComments, postInternalNote, postPublicComment, updateStaffTicketOwner, updateStaffTicketPriority, updateStaffTicketStatus }; });
vi.mock("../../src/context/AuthContext.js", () => ({ useAuth: () => ({ user: { id: 7, name: "Kevin Patel", role: "IT_STAFF" } }) }));

const ticket = { id: 1, ticketNumber: "TKT-2026-000001", summary: "Laptop issue", description: "Details", requestedPriority: "HIGH", itPriority: "MEDIUM", currentStatus: "IN_PROGRESS", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", ownerId: null, ownerName: null, category: { id: 1, name: "Hardware" }, requester: { id: 2, name: "Requester", email: "requester@example.com" }, publicComments: [], internalNotes: [] };

function renderPage() { return render(<MemoryRouter initialEntries={["/queue/1"]}><Routes><Route path="/queue/:id" element={<StaffTicketDetailPage />} /></Routes></MemoryRouter>); }

describe("StaffTicketDetailPage", () => {
  beforeEach(() => { getStaffTicket.mockReset().mockResolvedValue(ticket); getStaffOwners.mockReset().mockResolvedValue([{ id: 7, name: "Kevin Patel", email: "kevin@example.com" }]); getInternalNotes.mockReset().mockResolvedValue([]); getPublicComments.mockReset().mockResolvedValue([]); postInternalNote.mockReset(); postPublicComment.mockReset(); updateStaffTicketOwner.mockReset(); updateStaffTicketPriority.mockReset(); updateStaffTicketStatus.mockReset(); });

  it("renders operations and distinct internal notes panel", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Ticket Operations")).toBeInTheDocument());
    expect(screen.getByLabelText("Ticket Owner")).toBeInTheDocument();
    expect(screen.getByLabelText("IT Priority")).toBeInTheDocument();
    expect(screen.getByLabelText("Current Status")).toBeInTheDocument();
    expect(screen.getByText("🔒 Internal Notes")).toBeInTheDocument();
  });

  it("does not offer a status outside the permitted next values", async () => {
    getStaffTicket.mockResolvedValue({ ...ticket, currentStatus: "CLOSED" });
    renderPage();
    await waitFor(() => expect(screen.getByLabelText("Current Status")).toBeInTheDocument());
    expect(screen.getByLabelText("Current Status")).toHaveValue("");
    expect(screen.getByLabelText("Current Status").querySelectorAll("option")).toHaveLength(2);
  });

  it("calls owner, priority, and status operations and shows success feedback", async () => {
    updateStaffTicketOwner.mockResolvedValue({ ...ticket, ownerId: 7 });
    updateStaffTicketPriority.mockResolvedValue({ ...ticket, itPriority: "HIGH" });
    updateStaffTicketStatus.mockResolvedValue({ ...ticket, currentStatus: "RESOLVED" });
    renderPage();
    await waitFor(() => expect(screen.getByLabelText("Ticket Owner")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Ticket Owner"), { target: { value: "7" } });
    await waitFor(() => expect(updateStaffTicketOwner).toHaveBeenCalledWith(1, 7));
    fireEvent.change(screen.getByLabelText("IT Priority"), { target: { value: "HIGH" } });
    await waitFor(() => expect(updateStaffTicketPriority).toHaveBeenCalledWith(1, "HIGH"));
    fireEvent.change(screen.getByLabelText("Current Status"), { target: { value: "RESOLVED" } });
    await waitFor(() => expect(updateStaffTicketStatus).toHaveBeenCalledWith(1, "RESOLVED"));
    expect(screen.getByRole("status")).toHaveTextContent("Status saved.");
  });

  it("keeps the current state and reports a rejected status transition", async () => {
    const { ApiError } = await import("../../src/api.js");
    updateStaffTicketStatus.mockRejectedValue(new ApiError("Transition is not permitted", 409));
    renderPage();
    await waitFor(() => expect(screen.getByLabelText("Current Status")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Current Status"), { target: { value: "RESOLVED" } });
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Transition is not permitted"));
    expect(screen.getByText("IN PROGRESS")).toBeInTheDocument();
  });

  it("renders distinct not-found and safe server-error states", async () => {
    const { ApiError } = await import("../../src/api.js");
    getStaffTicket.mockRejectedValueOnce(new ApiError("Ticket not found", 404));
    renderPage();
    await waitFor(() => expect(screen.getByText("Ticket not found.")).toBeInTheDocument());
    getStaffTicket.mockRejectedValueOnce(new Error("server failure"));
    renderPage();
    await waitFor(() => expect(screen.getByText("Unable to load staff ticket detail.")).toBeInTheDocument());
  });
});
