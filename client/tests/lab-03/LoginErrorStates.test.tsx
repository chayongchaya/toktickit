import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/api.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import { LoginPage } from "../../src/pages/LoginPage.js";

const { getCurrentUser, loginRequest } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  loginRequest: vi.fn(),
}));

vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual<typeof import("../../src/api.js")>("../../src/api.js");
  return { ...actual, getCurrentUser, login: loginRequest };
});

const renderLogin = () => render(
  <AuthProvider>
    <BrowserRouter><LoginPage /></BrowserRouter>
  </AuthProvider>,
);

describe("LoginPage authentication failures", () => {
  beforeEach(() => {
    getCurrentUser.mockResolvedValue(null);
    loginRequest.mockReset();
  });

  it.each([
    ["invalid credentials", "Invalid email or password."],
    ["inactive accounts", "Invalid email or password."],
  ])("shows the generic banner for %s", async (_caseName, message) => {
    loginRequest.mockRejectedValue(new ApiError(message, 401));
    renderLogin();
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "WrongPass1!" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(message));
  });
});
