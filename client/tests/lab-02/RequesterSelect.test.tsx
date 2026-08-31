import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { SelectRequesterPage } from "../../src/pages/SelectRequesterPage";
import { RequesterContext } from "../../src/context/RequesterContext";

const mockRequesters = [
  { id: 1, name: "Jennifer Anderson", email: "jennifer@example.com", isActive: true },
  { id: 2, name: "Marcus Brody", email: "marcus@example.com", isActive: true },
];

const mockSetCurrentRequester = vi.fn();

const renderComponent = () => {
  return render(
    <RequesterContext.Provider
      value={{
        currentRequester: null,
        setCurrentRequester: mockSetCurrentRequester,
        requesters: mockRequesters,
        loading: false,
      }}
    >
      <BrowserRouter>
        <SelectRequesterPage />
      </BrowserRouter>
    </RequesterContext.Provider>
  );
};

describe("SelectRequesterPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders requester list and allows selection", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRequesters),
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /select development requester/i })).toBeInTheDocument();
      expect(screen.getByText(/Jennifer Anderson/i)).toBeInTheDocument();
    });

    const continueBtn = screen.getByRole("button", { name: /continue/i });
    fireEvent.click(continueBtn);

    expect(mockSetCurrentRequester).toHaveBeenCalledWith(mockRequesters[0]);
  });

  it("displays safe API failure message on fetch error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/unable to load requesters/i)).toBeInTheDocument();
    });
  });
});