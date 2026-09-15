import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { ApiError } from "../../src/api.js";
import { UserManagementPage } from "../../src/pages/admin/UserManagementPage.js";

const { getAdminUsers, createAdminUser, updateAdminUser, resetAdminUserPassword } = vi.hoisted(() => ({ getAdminUsers: vi.fn(), createAdminUser: vi.fn(), updateAdminUser: vi.fn(), resetAdminUserPassword: vi.fn() }));
vi.mock("../../src/api.js", async () => { const actual = await vi.importActual<typeof import("../../src/api.js")>("../../src/api.js"); return { ...actual, getAdminUsers, createAdminUser, updateAdminUser, resetAdminUserPassword }; });
vi.mock("../../src/context/AuthContext.js", () => ({ useAuth: () => ({ user: { id: 1, name: "Admin", email: "admin@example.com", role: "ADMINISTRATOR", mustChangePassword: false } }) }));

const user = { id: 2, name: "Kevin Patel", email: "kevin@example.com", role: "IT_STAFF" as const, isActive: true, mustChangePassword: false };

describe("UserManagementPage", () => {
  beforeEach(() => { getAdminUsers.mockReset().mockResolvedValue([user]); createAdminUser.mockReset(); updateAdminUser.mockReset(); resetAdminUserPassword.mockReset(); });

  it("renders searchable users and role badges", async () => {
    render(<BrowserRouter><UserManagementPage /></BrowserRouter>);
    await waitFor(() => expect(screen.getAllByText("Kevin Patel").length).toBeGreaterThan(0));
    expect(screen.getAllByText("IT Staff").some((element) => element.classList.contains("badge"))).toBe(true);
    getAdminUsers.mockClear();
    fireEvent.change(screen.getByLabelText("Search users"), { target: { value: "Kevin" } });
    expect(getAdminUsers).not.toHaveBeenCalled();
    await waitFor(() => expect(getAdminUsers).toHaveBeenLastCalledWith("Kevin", ""));
  });

  it("creates a user and validates required initial password", async () => {
    render(<BrowserRouter><UserManagementPage /></BrowserRouter>);
    await waitFor(() => expect(screen.getByLabelText("Full Name")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Save User" }));
    expect(await screen.findByText("Initial password is required.")).toBeInTheDocument();
    createAdminUser.mockResolvedValue({ ...user, id: 3, name: "New User" });
    fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "New User" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@example.com" } });
    fireEvent.change(screen.getByLabelText("Initial Password"), { target: { value: "TempPass1!" } });
    fireEvent.click(screen.getByRole("button", { name: "Save User" }));
    await waitFor(() => expect(createAdminUser).toHaveBeenCalledWith(expect.objectContaining({ name: "New User", email: "new@example.com", initialPassword: "TempPass1!" })));
  });

  it("edits, toggles a user, and resets the initial password", async () => {
    updateAdminUser.mockResolvedValue({ ...user, name: "Updated User", isActive: false });
    resetAdminUserPassword.mockResolvedValue({ mustChangePassword: true });
    render(<BrowserRouter><UserManagementPage /></BrowserRouter>);
    await waitFor(() => expect(screen.getAllByText("Kevin Patel").length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "Updated User" } });
    fireEvent.click(screen.getByRole("button", { name: "Set New Initial Password" }));
    fireEvent.change(screen.getByLabelText("New Initial Password"), { target: { value: "ResetPass1!" } });
    fireEvent.click(screen.getByRole("button", { name: "Save User" }));
    await waitFor(() => expect(updateAdminUser).toHaveBeenCalled());
    expect(resetAdminUserPassword).toHaveBeenCalledWith(2, "ResetPass1!");
  });

  it("shows safe conflict and failure messages", async () => {
    updateAdminUser.mockRejectedValue(new ApiError("A user with this email already exists", 409, "email"));
    render(<BrowserRouter><UserManagementPage /></BrowserRouter>);
    await waitFor(() => expect(screen.getAllByText("Kevin Patel").length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Save User" }));
    await waitFor(() => expect(screen.getByText("A user with this email already exists")).toBeInTheDocument());
  });

  it("shows distinct safe messages for forbidden, not-found, and server failures", async () => {
    getAdminUsers.mockRejectedValueOnce(new ApiError("Forbidden", 403));
    const { unmount } = render(<BrowserRouter><UserManagementPage /></BrowserRouter>);
    expect(await screen.findByText("You are not allowed to manage users.")).toBeInTheDocument();
    unmount();

    getAdminUsers.mockResolvedValue([user]);
    render(<BrowserRouter><UserManagementPage /></BrowserRouter>);
    await waitFor(() => expect(screen.getAllByText("Kevin Patel").length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    updateAdminUser.mockRejectedValueOnce(new ApiError("User not found", 404));
    fireEvent.click(screen.getByRole("button", { name: "Save User" }));
    expect(await screen.findByText("User was no longer available. The list was refreshed.")).toBeInTheDocument();

    updateAdminUser.mockRejectedValueOnce(new ApiError("Unable to update users", 500));
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Save User" }));
    expect(await screen.findByText("Unable to update users")).toBeInTheDocument();
  });

  it("shows named self-deactivation and last-admin conflict messages", async () => {
    getAdminUsers.mockResolvedValue([
      { ...user, id: 1, name: "Admin", email: "admin@example.com", role: "ADMINISTRATOR", isActive: true },
      { ...user, id: 2, role: "ADMINISTRATOR", isActive: true },
    ]);
    const { unmount } = render(<BrowserRouter><UserManagementPage /></BrowserRouter>);
    await waitFor(() => expect(screen.getAllByText("Admin").length).toBeGreaterThan(0));
    const rows = screen.getAllByRole("row");
    fireEvent.click(rows[1].querySelector("button")!);
    fireEvent.click(screen.getByRole("button", { name: "Deactivate User" }));
    expect(await screen.findByText("You cannot deactivate your own account.")).toBeInTheDocument();
    unmount();

    getAdminUsers.mockResolvedValue([{ ...user, id: 2, role: "ADMINISTRATOR", isActive: true }]);
    render(<BrowserRouter><UserManagementPage /></BrowserRouter>);
    await waitFor(() => expect(screen.getAllByText("Kevin Patel").length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" }).at(-1)!);
    fireEvent.click(screen.getAllByRole("button", { name: "Deactivate User" }).at(-1)!);
    expect(await screen.findByText("The last active Administrator cannot be deactivated or reassigned.")).toBeInTheDocument();
  });
});
