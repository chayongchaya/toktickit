import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter, MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/api.js";
import { ChangePasswordPage } from "../../src/pages/ChangePasswordPage.js";

const authState = vi.hoisted(() => ({
  user: { name: "First Login Tester" } as { name: string } | null,
  changePassword: vi.fn(),
  markPasswordChanged: vi.fn(),
  logout: vi.fn(),
}));
const { changePassword, markPasswordChanged, logout } = authState;
vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual<typeof import("../../src/api.js")>("../../src/api.js");
  return { ...actual, ApiError: actual.ApiError, changePassword: authState.changePassword };
});
vi.mock("../../src/context/AuthContext.js", () => ({ useAuth: () => ({ user: authState.user, markPasswordChanged, logout }) }));

describe("ChangePasswordPage", () => {
  beforeEach(() => {
    authState.user = { name: "First Login Tester" };
    changePassword.mockReset();
    markPasswordChanged.mockReset();
    logout.mockReset();
  });

  it("blocks incomplete policy and mismatched confirmation", async () => {
    render(<BrowserRouter><ChangePasswordPage /></BrowserRouter>);
    fireEvent.change(screen.getByLabelText("Current (temporary) password"), { target: { value: "TempPass1!" } });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "weak" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "different" } });
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "ValidPass1!" } });
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("submits a valid change and handles a server validation error", async () => {
    changePassword.mockResolvedValueOnce({ mustChangePassword: false });
    render(<BrowserRouter><ChangePasswordPage /></BrowserRouter>);
    fireEvent.change(screen.getByLabelText("Current (temporary) password"), { target: { value: "TempPass1!" } });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "ValidPass1!" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "ValidPass1!" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(changePassword).toHaveBeenCalledWith("TempPass1!", "ValidPass1!"));
    expect(markPasswordChanged).toHaveBeenCalled();

    changePassword.mockRejectedValueOnce(new ApiError("New password must differ from the current password.", 400, "newPassword"));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("New password must differ from the current password."));
  });

  it("redirects to login when the session is unavailable", async () => {
    authState.user = null;
    render(
      <MemoryRouter initialEntries={["/change-password"]}>
        <Routes>
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Login page")).toBeInTheDocument();
  });
});
