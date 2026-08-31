import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TicketDetailPage } from "../../src/pages/TicketDetailPage";
import { RequesterContext } from "../../src/context/RequesterContext";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mockRequester = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer@example.com",
  isActive: true,
};

describe("Attachment Section Component", () => {
  it("renders active attachments and displays soft-removed state", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 1,
          ticketNumber: "TKT-2026-000001",
          summary: "Attachment Test",
          description: "Checking attachment listing",
          category: { name: "Hardware" },
          relatedSystem: { name: "Printer" },
          requester: mockRequester,
          requestedPriority: "LOW",
          currentStatus: "NEW",
          createdAt: new Date().toISOString(),
          attachments: [
            {
              id: 101,
              fileName: "screenshot_error.png",
              fileSize: 102400,
              isRemoved: false,
            },
            {
              id: 102,
              fileName: "outdated_log.pdf",
              fileSize: 204800,
              isRemoved: true,
              removalReason: "Uploaded wrong file",
            },
          ],
        }),
    });

    render(
      <RequesterContext.Provider
        value={{
          currentRequester: mockRequester,
          setCurrentRequester: vi.fn(),
          requesters: [mockRequester],
          loading: false,
        }}
      >
        <MemoryRouter initialEntries={["/tickets/1"]}>
          <Routes>
            <Route path="/tickets/:id" element={<TicketDetailPage />} />
          </Routes>
        </MemoryRouter>
      </RequesterContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText("screenshot_error.png")).toBeInTheDocument();
      expect(screen.getByText("outdated_log.pdf")).toBeInTheDocument();
    });
  });
});