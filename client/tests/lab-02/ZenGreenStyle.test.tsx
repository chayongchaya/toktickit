import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CreateTicketPage } from "../../src/pages/CreateTicketPage";
import { TicketListPage } from "../../src/pages/TicketListPage";
import { TicketDetailPage } from "../../src/pages/TicketDetailPage";
import { RequesterContext } from "../../src/context/RequesterContext";

// Covers section 8.8 "UI Style Checking": automated assertions for required CSS
// classes, field states, labels, asterisks, messages, and button behavior — the
// zero-coverage gap identified during the tests.md review.

const mockRequester = { id: 1, name: "Jennifer Anderson", email: "jennifer@example.com", isActive: true };

const withRequesterContext = (children: React.ReactNode, requester = mockRequester) => (
  <RequesterContext.Provider
    value={{
      currentRequester: requester,
      setCurrentRequester: vi.fn(),
      requesters: [requester],
      loading: false,
    }}
  >
    {children}
  </RequesterContext.Provider>
);

const mockCategories = [
  { id: 1, name: "Hardware", isActive: true },
  { id: 2, name: "Network", isActive: true },
];

const mockSystems = [
  { id: 1, name: "Corporate Laptop", isActive: true },
  { id: 2, name: "VPN", isActive: true },
];

describe("Zen Green UI Style Checks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/api/categories")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCategories) });
      }
      if (typeof url === "string" && url.includes("/api/systems")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSystems) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
  });

  describe("Create Ticket form", () => {
    it("marks every required field with a visible asterisk", () => {
      const { container } = render(
        withRequesterContext(<BrowserRouter><CreateTicketPage /></BrowserRouter>)
      );

      const requiredFieldIds = ["summary", "category", "system", "description"];
      requiredFieldIds.forEach((id) => {
        const label = container.querySelector(`label[for="${id}"]`);
        expect(label).not.toBeNull();
        expect(label!.querySelector(".text-danger")).not.toBeNull();
      });

      const priorityLabel = container.querySelector('label[for="priority"]');
      expect(priorityLabel!.querySelector(".text-danger")).toBeNull();
    });

    it("applies the is-invalid class only to fields that actually failed validation", async () => {
      render(withRequesterContext(<BrowserRouter><CreateTicketPage /></BrowserRouter>));

      fireEvent.click(screen.getByRole("button", { name: /submit ticket/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/ticket summary/i)).toHaveClass("is-invalid");
      });
      expect(screen.getByLabelText(/requested priority/i)).not.toHaveClass("is-invalid");
    });

    it("shows a spinner and disables the button while the form is busy submitting", async () => {
      let resolveCreate: (value: any) => void = () => {};
      global.fetch = vi.fn().mockImplementation((url: string, init?: any) => {
        if (typeof url === "string" && url.includes("/api/categories")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCategories) });
        }
        if (typeof url === "string" && url.includes("/api/systems")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSystems) });
        }
        if (typeof url === "string" && url.includes("/api/tickets") && init?.method === "POST") {
          return new Promise((resolve) => {
            resolveCreate = resolve;
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      });

      render(withRequesterContext(<BrowserRouter><CreateTicketPage /></BrowserRouter>));

      await waitFor(() => expect(screen.getByRole("option", { name: "Hardware" })).toBeInTheDocument());

      fireEvent.change(screen.getByLabelText(/ticket summary/i), { target: { value: "Test issue" } });
      fireEvent.change(screen.getByLabelText(/^description/i), {
        target: { value: "A description long enough to pass validation." },
      });
      fireEvent.change(screen.getByLabelText(/category/i), { target: { value: "1" } });
      fireEvent.change(screen.getByLabelText(/related system/i), { target: { value: "1" } });
      fireEvent.click(screen.getByRole("button", { name: /submit ticket/i }));

      const busyButton = await screen.findByRole("button", { name: /submitting/i });
      expect(busyButton).toBeDisabled();
      expect(busyButton.querySelector(".spinner-border")).not.toBeNull();

      resolveCreate({ ok: true, json: () => Promise.resolve({ id: 1, ticketNumber: "TKT-2026-000001" }) });
      await waitFor(() => {});
    });
  });

  describe("My Tickets priority badges", () => {
    const ticketWith = (priority: string) => ({
      id: 1,
      ticketNumber: "TKT-2026-000001",
      summary: "Sample ticket",
      categoryId: 1,
      category: { id: 1, name: "Hardware" },
      relatedSystemId: 1,
      relatedSystem: { id: 1, name: "Corporate Laptop" },
      requesterId: 1,
      requester: mockRequester,
      requestedPriority: priority,
      priority: priority,
      currentStatus: "NEW",
      status: "NEW",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const zenGreenPriorityTokens: Record<string, { backgroundColor: string; color: string }> = {
      HIGH: { backgroundColor: "rgb(253, 232, 232)", color: "rgb(155, 28, 28)" },
      MEDIUM: { backgroundColor: "rgb(254, 240, 138)", color: "rgb(133, 77, 14)" },
      LOW: { backgroundColor: "rgb(222, 247, 236)", color: "rgb(3, 84, 63)" },
    };

    it.each(["HIGH", "MEDIUM", "LOW"])("renders the %s priority badge with the spec color token", async (priority) => {
      const singleTicket = ticketWith(priority);

      // สร้าง mock response ที่รองรับการ parse ข้อมูลทุกท่า
      const mockResult: any = [singleTicket];
      mockResult.data = [singleTicket];
      mockResult.tickets = [singleTicket];
      mockResult.items = [singleTicket];
      mockResult.total = 1;

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (typeof url === "string" && url.includes("/api/categories")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCategories) });
        }
        if (typeof url === "string" && url.includes("/api/systems")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSystems) });
        }
        if (typeof url === "string" && url.includes("/api/tickets")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockResult),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      render(withRequesterContext(<BrowserRouter><TicketListPage /></BrowserRouter>));

      await waitFor(() => expect(screen.getByText("TKT-2026-000001")).toBeInTheDocument());

      const label = priority === "HIGH" ? "High" : priority === "MEDIUM" ? "Medium" : "Low";
      const badge = screen
        .getAllByText(label)
        .find((el) => el.tagName === "SPAN") as HTMLElement;
      expect(badge).toBeTruthy();
      const expected = zenGreenPriorityTokens[priority];
      expect(badge).toHaveStyle({ backgroundColor: expected.backgroundColor });
      expect(badge).toHaveStyle({ color: expected.color });
    });
  });

  describe("Ticket Detail read-only fields", () => {
    it("visually distinguishes read-only header fields from editable form fields", async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (typeof url === "string" && url.includes("/api/categories")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCategories) });
        }
        if (typeof url === "string" && url.includes("/api/systems")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSystems) });
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 1,
              ticketNumber: "TKT-2026-000001",
              summary: "Read-only style check",
              description: "Checking field styling",
              category: { id: 2, name: "Network" },
              relatedSystem: { id: 2, name: "VPN" },
              requester: mockRequester,
              requestedPriority: "MEDIUM",
              currentStatus: "NEW",
              createdAt: new Date().toISOString(),
              attachments: [],
            }),
        });
      });

      render(
        withRequesterContext(
          <MemoryRouter initialEntries={["/tickets/1"]}>
            <Routes>
              <Route path="/tickets/:id" element={<TicketDetailPage />} />
            </Routes>
          </MemoryRouter>
        )
      );

      const ticketNumberField = await screen.findByDisplayValue("TKT-2026-000001");
      expect(ticketNumberField).toHaveClass("bg-light");
      expect(ticketNumberField).toHaveAttribute("readonly");
    });
  });
});