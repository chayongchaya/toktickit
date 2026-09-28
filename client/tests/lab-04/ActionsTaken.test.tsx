import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { StaffTicketDetailPage } from "../../src/pages/staff/StaffTicketDetailPage.js";

const mocks = vi.hoisted(() => ({
  getStaffTicket: vi.fn(), getStaffOwners: vi.fn(), getInternalNotes: vi.fn(), getPublicComments: vi.fn(),
  createActionTaken: vi.fn(), updateActionTaken: vi.fn(), getTicketById: vi.fn(), getPublicCommentsRequester: vi.fn(),
}));
vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual<typeof import("../../src/api.js")>("../../src/api.js");
  return { ...actual, ...mocks, getPublicComments: mocks.getPublicComments };
});
vi.mock("../../src/context/AuthContext.js", () => ({ useAuth: () => ({ user: { id: 7, name: "Kevin Patel", role: "IT_STAFF" } }) }));

const baseTicket: any = { id: 1, ticketNumber: "TKT-2026-000001", summary: "Laptop issue", description: "Details", requestedPriority: "HIGH", itPriority: "MEDIUM", currentStatus: "IN_PROGRESS", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", ownerId: null, ownerName: null, category: { id: 1, name: "Hardware" }, relatedSystem: { id: 1, name: "Corporate Laptop" }, requester: { id: 2, name: "Requester", email: "requester@example.com" }, publicComments: [], internalNotes: [], actionsTaken: [] };
const action = { id: 12, actionDateTime: "2026-01-02T10:00:00.000Z", description: "Restarted the device", result: "Device is working", followUpRequired: false, followUpNote: null, attachmentNotes: null, createdAt: "2026-01-02T10:00:00.000Z", updatedAt: "2026-01-02T10:00:00.000Z", performedBy: { id: 7, name: "Kevin Patel", role: "IT_STAFF" } };

function renderPage(ticket = baseTicket) {
  mocks.getStaffTicket.mockResolvedValue(ticket);
  mocks.getStaffOwners.mockResolvedValue([{ id: 7, name: "Kevin Patel", email: "kevin@example.com" }]);
  mocks.getInternalNotes.mockResolvedValue([]);
  mocks.getPublicComments.mockResolvedValue([]);
  return render(<MemoryRouter initialEntries={["/queue/1"]}><Routes><Route path="/queue/:id" element={<StaffTicketDetailPage />} /></Routes></MemoryRouter>);
}

describe("Actions Taken staff UI", () => {
  beforeEach(() => { Object.values(mocks).forEach((mock) => mock.mockReset()); });

  it("UI-01: renders the tab count, action list, and Add button", async () => {
    renderPage({ ...baseTicket, actionsTaken: [action] });
    await waitFor(() => expect(screen.getByRole("tab", { name: "Actions Taken (1)" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("tab", { name: "Actions Taken (1)" }));
    expect(screen.getByText("Restarted the device")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Add Action Taken" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("UI-02: creates an action from the shared form", async () => {
    mocks.createActionTaken.mockResolvedValue({ ...action, id: 13, description: "Created action" });
    renderPage();
    await waitFor(() => screen.getByRole("tab", { name: "Actions Taken (0)" }));
    fireEvent.click(screen.getByRole("tab", { name: "Actions Taken (0)" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Add Action Taken" }));
    fireEvent.change(screen.getByLabelText("Action Description"), { target: { value: "Created action" } });
    fireEvent.change(screen.getByLabelText("Result"), { target: { value: "Created result" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Action Taken" }));
    await waitFor(() => expect(mocks.createActionTaken).toHaveBeenCalledWith(1, expect.objectContaining({ description: "Created action", result: "Created result", followUpRequired: false })));
    expect(await screen.findByText("Created action")).toBeInTheDocument();
  });

  it("UI-03: validates follow-up note before sending", async () => {
    renderPage();
    await waitFor(() => screen.getByRole("tab", { name: "Actions Taken (0)" }));
    fireEvent.click(screen.getByRole("tab", { name: "Actions Taken (0)" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Add Action Taken" }));
    fireEvent.change(screen.getByLabelText("Action Description"), { target: { value: "Need follow-up" } });
    fireEvent.change(screen.getByLabelText("Result"), { target: { value: "Pending" } });
    fireEvent.click(screen.getByLabelText("Follow-Up Required?"));
    fireEvent.click(screen.getByRole("button", { name: "Save Action Taken" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Follow-up Note is required");
    expect(mocks.createActionTaken).not.toHaveBeenCalled();
  });

  it("UI-04: only renders Follow-up Note when selected", async () => {
    renderPage();
    await waitFor(() => screen.getByRole("tab", { name: "Actions Taken (0)" }));
    fireEvent.click(screen.getByRole("tab", { name: "Actions Taken (0)" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Add Action Taken" }));
    expect(screen.queryByLabelText("Follow-up Note")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Follow-Up Required?"));
    expect(screen.getByLabelText("Follow-up Note")).toBeInTheDocument();
  });

  it("UI-05: preserves entered values when the server rejects the form", async () => {
    mocks.createActionTaken.mockRejectedValue(new Error("Follow-up Note is required when follow-up is needed"));
    renderPage();
    await waitFor(() => screen.getByRole("tab", { name: "Actions Taken (0)" }));
    fireEvent.click(screen.getByRole("tab", { name: "Actions Taken (0)" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Add Action Taken" }));
    fireEvent.change(screen.getByLabelText("Action Description"), { target: { value: "Keep this draft" } });
    fireEvent.change(screen.getByLabelText("Result"), { target: { value: "Keep this result" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Action Taken" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Follow-up Note is required");
    expect(screen.getByLabelText("Action Description")).toHaveValue("Keep this draft");
    expect(screen.getByLabelText("Result")).toHaveValue("Keep this result");
  });

  it("UI-06: edits an existing action with the same form", async () => {
    mocks.updateActionTaken.mockResolvedValue({ ...action, result: "Updated result" });
    renderPage({ ...baseTicket, actionsTaken: [action] });
    await waitFor(() => screen.getByRole("tab", { name: "Actions Taken (1)" }));
    fireEvent.click(screen.getByRole("tab", { name: "Actions Taken (1)" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Result"), { target: { value: "Updated result" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Action Taken" }));
    await waitFor(() => expect(mocks.updateActionTaken).toHaveBeenCalledWith(1, 12, expect.objectContaining({ result: "Updated result" })));
  });

  it("UI-07: disables Save while the request is in flight", async () => {
    let resolve: (value: typeof action) => void = () => undefined;
    mocks.createActionTaken.mockReturnValue(new Promise<typeof action>((r) => { resolve = r; }));
    renderPage();
    await waitFor(() => screen.getByRole("tab", { name: "Actions Taken (0)" }));
    fireEvent.click(screen.getByRole("tab", { name: "Actions Taken (0)" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Add Action Taken" }));
    fireEvent.change(screen.getByLabelText("Action Description"), { target: { value: "Busy action" } });
    fireEvent.change(screen.getByLabelText("Result"), { target: { value: "Busy result" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Action Taken" }));
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
    await act(async () => { resolve(action); });
  });

  it("A11Y-01: form controls have labels and the validation is an alert", async () => {
    renderPage();
    await waitFor(() => screen.getByRole("tab", { name: "Actions Taken (0)" }));
    fireEvent.click(screen.getByRole("tab", { name: "Actions Taken (0)" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Add Action Taken" }));
    expect(screen.getByLabelText("Action Description")).toBeInTheDocument();
    expect(screen.getByLabelText("Result")).toBeInTheDocument();
    expect(screen.getByLabelText("Follow-Up Required?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save Action Taken" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
