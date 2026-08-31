import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "../../src/App";

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/requesters")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { id: 1, name: "Jennifer Anderson", email: "jennifer@example.com", isActive: true },
            ]),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });
  });

  it("renders the TokTickIT heading", () => {
    render(<App />);
    expect(screen.getByText(/Select Development Requester/i)).toBeInTheDocument();
  });

  it("shows Online and the seeded categories on success", () => {
    render(<App />);
    expect(screen.getByText(/Authentication coming in Lab 3/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
  });

  it("shows an Offline error message when the API is unavailable", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });
});