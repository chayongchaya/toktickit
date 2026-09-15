import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "../../src/pages/LoginPage.js";

const { login } = vi.hoisted(() => ({ login: vi.fn() }));
vi.mock("../../src/context/AuthContext.js", () => ({ useAuth: () => ({ login }) }));

describe("LoginPage", () => {
  beforeEach(() => login.mockReset());

  it("validates required fields", () => {
    render(<BrowserRouter><LoginPage /></BrowserRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Please enter both email and password.");

  });

  it("submits valid credentials and routes the user to their role home", async () => {
    login.mockResolvedValue({ id: 1, name: "Jennifer", email: "jennifer@example.com", role: "REQUESTER", mustChangePassword: false });
    render(<BrowserRouter><LoginPage /></BrowserRouter>);
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "jennifer@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "ValidPass1!" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
    await waitFor(() => expect(login).toHaveBeenCalledWith("jennifer@example.com", "ValidPass1!"));
  });
});
