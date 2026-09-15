import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { StaffTicketDetailPage } from "../../src/pages/staff/StaffTicketDetailPage.js";

const { getStaffTicket, getStaffOwners, getInternalNotes } = vi.hoisted(() => ({ getStaffTicket: vi.fn(), getStaffOwners: vi.fn(), getInternalNotes: vi.fn() }));
vi.mock("../../src/api.js", async () => { const actual = await vi.importActual<typeof import("../../src/api.js")>("../../src/api.js"); return { ...actual, getStaffTicket, getStaffOwners, getInternalNotes }; });
vi.mock("../../src/context/AuthContext.js", () => ({ useAuth: () => ({ user: { id: 7, name: "Kevin Patel", role: "IT_STAFF" } }) }));

const ticket = { id: 1, ticketNumber: "TKT-2026-000001", summary: "Laptop issue", description: "Details", requestedPriority: "HIGH", itPriority: "MEDIUM", currentStatus: "IN_PROGRESS", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", ownerId: null, ownerName: null, category: { id: 1, name: "Hardware" }, requester: { id: 2, name: "Requester", email: "requester@example.com" }, publicComments: [], internalNotes: [] };

function renderPage() { return render(<MemoryRouter initialEntries={["/queue/1"]}><Routes><Route path="/queue/:id" element={<StaffTicketDetailPage />} /></Routes></MemoryRouter>); }

describe("StaffTicketDetailPage", () => {
  beforeEach(() => { getStaffTicket.mockReset().mockResolvedValue(ticket); getStaffOwners.mockReset().mockResolvedValue([{ id: 7, name: "Kevin Patel", email: "kevin@example.com" }]); getInternalNotes.mockReset().mockResolvedValue([]); });

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
});
