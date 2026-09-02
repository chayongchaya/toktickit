import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { SelectRequesterPage } from "../../src/pages/SelectRequesterPage";
import { RequesterContext } from "../../src/context/RequesterContext";

// Covers: AC-02 (Dev Requester selection is a testing mechanism, not auth), and the
// section 8.1 checklist: loading state, empty state, safe API-failure state.

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

  it("shows a loading indicator while active requesters are being fetched", async () => {
    let resolveFetch: (value: any) => void = () => {};
    global.fetch = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    );

    renderComponent();

    expect(screen.getByText(/Loading active requesters\.\.\./i)).toBeInTheDocument();
    // Continue must not be usable while the list is still loading.
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();

    resolveFetch({ ok: true, json: () => Promise.resolve(mockRequesters) });

    await waitFor(() => {
      expect(screen.queryByText(/Loading active requesters\.\.\./i)).not.toBeInTheDocument();
    });
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
    expect(continueBtn).not.toBeDisabled();
    fireEvent.click(continueBtn);

    expect(mockSetCurrentRequester).toHaveBeenCalledWith(mockRequesters[0]);
  });

  it("shows an empty-state message and disables Continue when there are no active requesters", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/No active requesters available\./i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
    expect(mockSetCurrentRequester).not.toHaveBeenCalled();
  });

  it("displays a safe API failure message on fetch error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/unable to load requesters/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
  });
});
