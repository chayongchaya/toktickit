import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TicketDetailPage } from "../../src/pages/TicketDetailPage";

const { getTicketById, getPublicComments } = vi.hoisted(() => ({ getTicketById: vi.fn(), getPublicComments: vi.fn() }));
vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual<typeof import("../../src/api.js")>("../../src/api.js");
  return { ...actual, getTicketById, getPublicComments };
});
vi.mock("../../src/context/AuthContext.js", () => ({ useAuth: () => ({ user: { id: 2, name: "Requester", role: "REQUESTER" } }) }));

describe("Requester Actions Taken workflow", () => {
  it("UI-08: renders actions read-only without Add or Edit controls", async () => {
    getTicketById.mockResolvedValue({ id: 1, ticketNumber: "TKT-2026-000001", summary: "Issue", description: "Details", requestedPriority: "MEDIUM", currentStatus: "OPEN", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", attachments: [], actionsTaken: [{ id: 4, actionDateTime: "2026-01-02T10:00:00.000Z", description: "Checked logs", result: "Found the cause", followUpRequired: true, followUpNote: "Monitor for one day", attachmentNotes: null, createdAt: "2026-01-02T10:00:00.000Z", updatedAt: "2026-01-02T10:00:00.000Z", performedBy: { id: 7, name: "Kevin Patel", role: "IT_STAFF" } }] });
    getPublicComments.mockResolvedValue([]);
    render(<MemoryRouter initialEntries={["/tickets/1"]}><Routes><Route path="/tickets/:id" element={<TicketDetailPage />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(getTicketById).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText("Loading ticket details...")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/Checked logs/)).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /Add Action Taken/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  });
});
