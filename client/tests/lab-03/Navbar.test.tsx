import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { Navbar } from "../../src/components/Navbar.js";

const { mockUser } = vi.hoisted(() => ({ mockUser: { role: "REQUESTER", name: "Test User", email: "user@example.com" } }));
vi.mock("../../src/context/AuthContext.js", () => ({ useAuth: () => ({ user: mockUser, logout: vi.fn() }) }));

function renderNavbar(role: string) {
  mockUser.role = role;
  return render(<MemoryRouter><Navbar /></MemoryRouter>);
}

describe("Navbar role gating", () => {
  it("shows only requester destinations for a Requester", () => {
    renderNavbar("REQUESTER");
    expect(screen.getByRole("link", { name: /My Tickets/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Create Ticket/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /My Queue/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Admin/ })).not.toBeInTheDocument();
  });

  it("shows only the queue destination for IT Staff", () => {
    renderNavbar("IT_STAFF");
    expect(screen.getByRole("link", { name: /My Queue/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /My Tickets/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Admin/ })).not.toBeInTheDocument();
  });

  it("shows queue and admin destinations for Administrator", () => {
    renderNavbar("ADMINISTRATOR");
    expect(screen.getByRole("link", { name: /My Queue/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Admin/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /My Tickets/ })).not.toBeInTheDocument();
  });
});
