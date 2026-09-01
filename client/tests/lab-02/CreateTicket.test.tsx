import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { CreateTicketPage } from "../../src/pages/CreateTicketPage";
import { RequesterContext } from "../../src/context/RequesterContext";

// Covers: AC-01 (create ticket + system-generated number), section 4.5 (attachment
// rules), section 8.3 (busy submit button, validation placement).

const mockRequester = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer@example.com",
  isActive: true,
};

const mockCategories = [{ id: 1, name: "Hardware", isActive: true }];
const mockSystems = [{ id: 1, name: "Corporate Laptop", isActive: true }];

const renderComponent = () => {
  return render(
    <RequesterContext.Provider
      value={{
        currentRequester: mockRequester,
        setCurrentRequester: vi.fn(),
        requesters: [mockRequester],
        loading: false,
      }}
    >
      <BrowserRouter>
        <CreateTicketPage />
      </BrowserRouter>
    </RequesterContext.Provider>
  );
};

const mockReferenceDataFetch = () =>
  vi.fn().mockImplementation((url: string) => {
    if (typeof url === "string" && url.includes("/api/categories")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCategories) });
    }
    if (typeof url === "string" && url.includes("/api/systems")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSystems) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });

describe("CreateTicketPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockReferenceDataFetch();
  });

  it("renders Create Ticket form with requester info and reference data", async () => {
    renderComponent();

    expect(screen.getByRole("heading", { name: /create support ticket/i })).toBeInTheDocument();
    expect(screen.getByText(/Jennifer Anderson/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Hardware" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Corporate Laptop" })).toBeInTheDocument();
    });
  });

  it("shows an inline error message under each empty required field on submit", async () => {
    renderComponent();

    const submitBtn = screen.getByRole("button", { name: /submit ticket/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText("Ticket summary is required.")).toBeInTheDocument();
    expect(screen.getByText("Ticket description is required.")).toBeInTheDocument();
    expect(screen.getByText("Category selection is required.")).toBeInTheDocument();
    expect(screen.getByText("Related system selection is required.")).toBeInTheDocument();

    expect(screen.getByLabelText(/ticket summary/i)).toHaveClass("is-invalid");
    expect(screen.getByLabelText(/^description/i)).toHaveClass("is-invalid");

    const postCalls = (global.fetch as any).mock.calls.filter(
      ([, init]: any) => init?.method === "POST"
    );
    expect(postCalls.length).toBe(0);
  });

  it("clears a field's error as soon as the user starts correcting it", async () => {
    renderComponent();

    fireEvent.click(screen.getByRole("button", { name: /submit ticket/i }));
    expect(await screen.findByText("Ticket summary is required.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/ticket summary/i), {
      target: { value: "Cannot access VPN" },
    });

    expect(screen.queryByText("Ticket summary is required.")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/ticket summary/i)).not.toHaveClass("is-invalid");
  });

  it("rejects an attachment with a disallowed file type before upload", async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByRole("option", { name: "Hardware" })).toBeInTheDocument());

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const badFile = new File(["dummy"], "malware.exe", { type: "application/x-msdownload" });

    fireEvent.change(fileInput, { target: { files: [badFile] } });

    expect(
      await screen.findByText(/Only JPG, PNG, WEBP, and PDF files are allowed/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/No files selected\./i)).toBeInTheDocument();
  });

  it("rejects an attachment larger than 5 MB", async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByRole("option", { name: "Hardware" })).toBeInTheDocument());

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const oversizedFile = new File([new ArrayBuffer(6 * 1024 * 1024)], "diagnostic.png", {
      type: "image/png",
    });

    fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

    expect(await screen.findByText(/exceeds the maximum 5 MB limit/i)).toBeInTheDocument();
  });

  it("rejects attaching more than 5 files to a ticket", async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByRole("option", { name: "Hardware" })).toBeInTheDocument());

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const sixFiles = Array.from(
      { length: 6 },
      (_, i) => new File(["x"], `file-${i}.png`, { type: "image/png" })
    );

    fireEvent.change(fileInput, { target: { files: sixFiles } });

    expect(
      await screen.findByText(/Cannot attach more than 5 active files per ticket\./i)
    ).toBeInTheDocument();
  });

  it("shows a busy, disabled submit button while the ticket is being created", async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByRole("option", { name: "Hardware" })).toBeInTheDocument());

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
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    fireEvent.change(screen.getByLabelText(/ticket summary/i), {
      target: { value: "Cannot access VPN" },
    });
    fireEvent.change(screen.getByLabelText(/^description/i), {
      target: { value: "Timeout when connecting to VPN from home network." },
    });
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/related system/i), { target: { value: "1" } });

    fireEvent.click(screen.getByRole("button", { name: /submit ticket/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /submitting/i })).toBeDisabled();
    });
    expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();

    resolveCreate({ ok: true, json: () => Promise.resolve({ id: 101, ticketNumber: "TKT-2026-000101" }) });
    await waitFor(() => {});
  });

  it("submits valid data and posts the requester id and trimmed field values", async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByRole("option", { name: "Hardware" })).toBeInTheDocument());

    let capturedBody: any = null;
    global.fetch = vi.fn().mockImplementation((url: string, init?: any) => {
      if (typeof url === "string" && url.includes("/api/categories")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCategories) });
      }
      if (typeof url === "string" && url.includes("/api/systems")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSystems) });
      }
      if (typeof url === "string" && url.includes("/api/tickets") && init?.method === "POST") {
        if (init.body) {
          capturedBody = typeof init.body === "string" ? JSON.parse(init.body) : init.body;
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 101, ticketNumber: "TKT-2026-000101" }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    fireEvent.change(screen.getByLabelText(/ticket summary/i), {
      target: { value: "  Cannot access VPN  " },
    });
    fireEvent.change(screen.getByLabelText(/^description/i), {
      target: { value: "  Timeout when connecting to VPN from home network.  " },
    });
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/related system/i), { target: { value: "1" } });

    fireEvent.click(screen.getByRole("button", { name: /submit ticket/i }));

    await waitFor(() => expect(capturedBody).not.toBeNull());
    expect(capturedBody.summary).toBe("Cannot access VPN");
    expect(capturedBody.description).toBe("Timeout when connecting to VPN from home network.");
    expect(capturedBody.requesterId).toBe(mockRequester.id);
    expect(Number(capturedBody.categoryId)).toBe(1);
    expect(Number(capturedBody.relatedSystemId ?? capturedBody.systemId)).toBe(1);
  });

  it("shows a safe error banner and preserves form values when the backend rejects the submission", async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByRole("option", { name: "Hardware" })).toBeInTheDocument());

    global.fetch = vi.fn().mockImplementation((url: string, init?: any) => {
      if (typeof url === "string" && url.includes("/api/categories")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCategories) });
      }
      if (typeof url === "string" && url.includes("/api/systems")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSystems) });
      }
      if (typeof url === "string" && url.includes("/api/tickets") && init?.method === "POST") {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: "Failed to create support ticket." }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    fireEvent.change(screen.getByLabelText(/ticket summary/i), {
      target: { value: "Cannot access VPN" },
    });
    fireEvent.change(screen.getByLabelText(/^description/i), {
      target: { value: "Timeout when connecting to VPN from home network." },
    });
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/related system/i), { target: { value: "1" } });

    fireEvent.click(screen.getByRole("button", { name: /submit ticket/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/failed to create support ticket/i);

    expect(screen.getByLabelText(/ticket summary/i)).toHaveValue("Cannot access VPN");
    expect(screen.getByLabelText(/^description/i)).toHaveValue(
      "Timeout when connecting to VPN from home network."
    );
  });
});