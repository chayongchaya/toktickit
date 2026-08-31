import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { TicketListPage } from "../../src/pages/TicketListPage";
import { RequesterContext } from "../../src/context/RequesterContext";

const mockRequester = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer@example.com",
  isActive: true,
};

const renderComponent = () => {
  return render(
    <RequesterContext.Provider
      value={{
        currentRequester: mockRequester,
        setCurrentRequester: vi.fn(),
        requesters: [mockRequester],
        loading: false,
      }}
    >
      <BrowserRouter>
        <TicketListPage />
      </BrowserRouter>
    </RequesterContext.Provider>
  );
};

describe("TicketListPage (My Tickets) Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("displays a list of tickets belonging to the current requester", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/categories")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ id: 1, name: "Hardware" }]),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            tickets: [
              {
                id: 1,
                ticketNumber: "TKT-2026-000001",
                summary: "Laptop Screen Flickering",
                category: { name: "Hardware" },
                requestedPriority: "HIGH",
                currentStatus: "NEW",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            total: 1,
            page: 1,
            totalPages: 1,
          }),
      });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000001")).toBeInTheDocument();
      expect(screen.getByText("Laptop Screen Flickering")).toBeInTheDocument();
    });
  });

  it("shows empty state when no tickets are found", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/categories")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            tickets: [],
            total: 0,
            page: 1,
            totalPages: 0,
          }),
      });
    });

    renderComponent();

    await waitFor(() => {
      const emptyIndicator = screen.getByText(/no tickets found/i);
      expect(emptyIndicator).toBeInTheDocument();
    });
  });
});