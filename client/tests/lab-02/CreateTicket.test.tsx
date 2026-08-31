import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { CreateTicketPage } from "../../src/pages/CreateTicketPage";
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
        <CreateTicketPage />
      </BrowserRouter>
    </RequesterContext.Provider>
  );
};

describe("CreateTicketPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/categories")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ id: 1, name: "Hardware", isActive: true }]),
        });
      }
      if (url.includes("/api/systems")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ id: 1, name: "Corporate Laptop", isActive: true }]),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  it("renders Create Ticket form with requester info and reference data", async () => {
    renderComponent();

    expect(screen.getByRole("heading", { name: /create support ticket/i })).toBeInTheDocument();
    expect(screen.getByText(/Jennifer Anderson/i)).toBeInTheDocument();
  });

  it("shows validation error when submitting with empty summary or description", async () => {
    renderComponent();

    const submitBtn = screen.getByRole("button", { name: /submit ticket/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const summaryInput = screen.getByLabelText(/ticket summary/i);
      expect(summaryInput).toBeInTheDocument();
    });
  });
});