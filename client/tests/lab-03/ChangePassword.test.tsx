import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/api.js";
import { ChangePasswordPage } from "../../src/pages/ChangePasswordPage.js";

const { changePassword, markPasswordChanged, logout } = vi.hoisted(() => ({ changePassword: vi.fn(), markPasswordChanged: vi.fn(), logout: vi.fn() }));
vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual<typeof import("../../src/api.js")>("../../src/api.js");
  return { ...actual, changePassword };
});
vi.mock("../../src/context/AuthContext.js", () => ({ useAuth: () => ({ user: { name: "First Login Tester" }, markPasswordChanged, logout }) }));

describe("ChangePasswordPage", () => {
  beforeEach(() => { changePassword.mockReset(); markPasswordChanged.mockReset(); logout.mockReset(); });

  it("blocks incomplete policy and mismatched confirmation", async () => {
    render(<BrowserRouter><ChangePasswordPage /></BrowserRouter>);
    fireEvent.change(screen.getByLabelText("Current (temporary) password"), { target: { value: "TempPass1!" } });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "weak" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "different" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Please meet all password requirements below.");

    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "ValidPass1!" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Passwords do not match.");
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
});
