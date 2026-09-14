import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "../../src/App";

// Lab 3 (BR-32): the Development Requester selector ("Select Development
// Requester") has been removed and replaced by real authentication
// (§8.1). App's "/" route now redirects to /login and renders LoginPage
// instead of the removed selector screen, so these tests exercise the
// Login screen in its place. Adapted per docs/lab-03/tests.md MIG-03.

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      // AuthProvider always calls GET /api/auth/me on mount to check for
      // an existing session. There is none in these tests, so respond the
      // same way the real API does for an unauthenticated visitor.
      if (typeof url === "string" && url.includes("/api/auth/me")) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: "Not authenticated" }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
  });

  it("renders the Sign In heading when no session exists", async () => {
    render(<App />);

    expect(await screen.findByText(/Sign in to your account/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
  });

  it("shows a client-side validation message when submitting without email or password", async () => {
    render(<App />);
    await screen.findByText(/Sign in to your account/i);

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText(/please enter both email and password/i)
    ).toBeInTheDocument();
  });

  it("shows a safe error message when the backend rejects invalid credentials", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/api/auth/me")) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: "Not authenticated" }),
        });
      }
      if (typeof url === "string" && url.includes("/api/auth/login")) {
        // BR-01/AC-05: the server returns the same generic message for
        // wrong password and inactive account — this test only exercises
        // the UI's display of that message, not which case triggered it.
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: "Invalid email or password." }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    render(<App />);
    await screen.findByText(/Sign in to your account/i);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "jennifer@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/invalid email or password/i);
  });
});
