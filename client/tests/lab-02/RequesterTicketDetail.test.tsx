import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TicketDetailPage } from "../../src/pages/TicketDetailPage";
import { RequesterContext } from "../../src/context/RequesterContext";

const mockRequester = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer@example.com",
  isActive: true,
};

const renderComponent = (ticketId = "1") => {
  return render(
    <RequesterContext.Provider
      value={{
        currentRequester: mockRequester,
        setCurrentRequester: vi.fn(),
        requesters: [mockRequester],
        loading: false,
      }}
    >
      <MemoryRouter initialEntries={[`/tickets/${ticketId}`]}>
        <Routes>
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
        </Routes>
      </MemoryRouter>
    </RequesterContext.Provider>
  );
};

describe("TicketDetailPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders read-only ticket details accurately", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 1,
          ticketNumber: "TKT-2026-000001",
          summary: "Cannot access VPN network",
          description: "Getting timeout error 504",
          category: { name: "Network" },
          relatedSystem: { name: "VPN" },
          requester: mockRequester,
          requestedPriority: "HIGH",
          currentStatus: "NEW",
          createdAt: new Date().toISOString(),
          attachments: [],
        }),
    });

    renderComponent("1");

    await waitFor(() => {
      expect(screen.getByDisplayValue("TKT-2026-000001")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Cannot access VPN network")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Getting timeout error 504")).toBeInTheDocument();
    });
  });
});