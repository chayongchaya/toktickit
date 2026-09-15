import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { StaffTicketDetailPage } from "../../src/pages/staff/StaffTicketDetailPage.js";

const { getStaffTicket, getStaffOwners, getInternalNotes, getPublicComments, postInternalNote, postPublicComment, updateStaffTicketOwner, updateStaffTicketPriority, updateStaffTicketStatus } = vi.hoisted(() => ({ getStaffTicket: vi.fn(), getStaffOwners: vi.fn(), getInternalNotes: vi.fn(), getPublicComments: vi.fn(), postInternalNote: vi.fn(), postPublicComment: vi.fn(), updateStaffTicketOwner: vi.fn(), updateStaffTicketPriority: vi.fn(), updateStaffTicketStatus: vi.fn() }));
vi.mock("../../src/api.js", async () => { const actual = await vi.importActual<typeof import("../../src/api.js")>("../../src/api.js"); return { ...actual, getStaffTicket, getStaffOwners, getInternalNotes, getPublicComments, postInternalNote, postPublicComment, updateStaffTicketOwner, updateStaffTicketPriority, updateStaffTicketStatus }; });
vi.mock("../../src/context/AuthContext.js", () => ({ useAuth: () => ({ user: { id: 7, name: "Kevin Patel", role: "IT_STAFF" } }) }));

const ticket = { id: 1, ticketNumber: "TKT-2026-000001", summary: "Laptop issue", description: "Details", requestedPriority: "HIGH", itPriority: "MEDIUM", currentStatus: "IN_PROGRESS", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", ownerId: null, ownerName: null, category: { id: 1, name: "Hardware" }, relatedSystem: { id: 1, name: "Corporate Laptop" }, requester: { id: 2, name: "Requester", email: "requester@example.com" }, publicComments: [], internalNotes: [] };

function renderPage() { return render(<MemoryRouter initialEntries={["/queue/1"]}><Routes><Route path="/queue/:id" element={<StaffTicketDetailPage />} /></Routes></MemoryRouter>); }

describe("StaffTicketDetailPage", () => {
  beforeEach(() => { getStaffTicket.mockReset().mockResolvedValue(ticket); getStaffOwners.mockReset().mockResolvedValue([{ id: 7, name: "Kevin Patel", email: "kevin@example.com" }]); getInternalNotes.mockReset().mockResolvedValue([]); getPublicComments.mockReset().mockResolvedValue([]); postInternalNote.mockReset(); postPublicComment.mockReset(); updateStaffTicketOwner.mockReset(); updateStaffTicketPriority.mockReset(); updateStaffTicketStatus.mockReset(); });

  it("renders operations and distinct internal notes panel", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Ticket Operations")).toBeInTheDocument());
    expect(screen.getByLabelText("Ticket Owner")).toBeInTheDocument();
    expect(screen.getByLabelText("IT Priority")).toBeInTheDocument();
    expect(screen.getByLabelText("Current Status")).toBeInTheDocument();
    expect(screen.getByText("Corporate Laptop")).toBeInTheDocument();
    expect(screen.getAllByText("HIGH").find((element) => element.tagName === "SPAN")).toHaveStyle({ backgroundColor: "#F8B4B4", color: "#9B1C1C" });
    expect(screen.getByText("IN PROGRESS")).toHaveStyle({ backgroundColor: "#FEF3C7", color: "#92400E" });
    expect(screen.getByText("🔒 Internal Notes")).toBeInTheDocument();
  });

  it("does not offer a status outside the permitted next values", async () => {
    getStaffTicket.mockResolvedValue({ ...ticket, currentStatus: "CLOSED" });
    renderPage();
    await waitFor(() => expect(screen.getByLabelText("Current Status")).toBeInTheDocument());
    expect(screen.getByLabelText("Current Status")).toHaveValue("");
    expect(screen.getByLabelText("Current Status").querySelectorAll("option")).toHaveLength(2);
  });

  it("shows active and removed attachments with the removal reason", async () => {
    getStaffTicket.mockResolvedValue({ ...ticket, attachments: [
      { id: 1, fileName: "stored.pdf", originalFileName: "evidence.pdf", fileSize: 2048, isRemoved: false },
      { id: 2, fileName: "old.png", originalFileName: "old-screenshot.png", fileSize: 1024, isRemoved: true, removalReason: "Uploaded by mistake" },
      { id: 3, fileName: "missing.pdf", originalFileName: "missing.pdf", fileSize: 512, isRemoved: false, isUnavailable: true },
    ] });
    renderPage();
    await waitFor(() => expect(screen.getByRole("tab", { name: /Attachments/ })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("tab", { name: /Attachments/ }));
    expect(screen.getByText("evidence.pdf")).toBeInTheDocument();
    expect(screen.getByText("old-screenshot.png")).toBeInTheDocument();
    expect(screen.getByText(/Removal reason: Uploaded by mistake/)).toBeInTheDocument();
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Download" })).toHaveLength(1);
  });

  it("renders the detail loading state", () => {
    getStaffTicket.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText("Loading ticket detail...")).toBeInTheDocument();
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
    expect(screen.getAllByRole("status").some((element) => element.textContent === "Status saved.")).toBe(true);
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

  it("submits public comments and internal notes", async () => {
    postPublicComment.mockResolvedValue({ id: 10, content: "Public update", createdAt: ticket.createdAt, author: { id: 7, name: "Kevin Patel", role: "IT_STAFF" } });
    postInternalNote.mockResolvedValue({ id: 11, ticketId: 1, content: "Private handoff", createdAt: ticket.createdAt, author: { id: 7, name: "Kevin Patel", role: "IT_STAFF" } });
    renderPage();
    await waitFor(() => expect(screen.getByLabelText("Add Public Comment")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Add Public Comment"), { target: { value: "Public update" } });
    fireEvent.click(screen.getByRole("button", { name: "Post Comment" }));
    await waitFor(() => expect(postPublicComment).toHaveBeenCalledWith("1", "Public update"));
    expect(screen.getByText("Public update")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Internal Notes/ }));
    fireEvent.change(screen.getByLabelText("Add Internal Note"), { target: { value: "Private handoff" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Note" }));
    await waitFor(() => expect(postInternalNote).toHaveBeenCalledWith("1", "Private handoff"));
    expect(screen.getByText("Private handoff")).toBeInTheDocument();
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
