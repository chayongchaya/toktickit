import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TicketDetailPage } from "../../src/pages/TicketDetailPage";
import { RequesterContext } from "../../src/context/RequesterContext";

// Covers: AC-04 (attachment restrictions), AC-05 (soft removal + reason required,
// blocked download), AC-12 (original filename display), section 4.5 attachment rules.

const mockRequester = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer@example.com",
  isActive: true,
};

const baseTicket = {
  id: 1,
  ticketNumber: "TKT-2026-000001",
  summary: "Attachment Test",
  description: "Checking attachment listing",
  category: { name: "Hardware" },
  relatedSystem: { name: "Printer" },
  requester: mockRequester,
  requestedPriority: "LOW",
  currentStatus: "NEW",
  createdAt: new Date().toISOString(),
  attachments: [
    { id: 101, fileName: "screenshot_error.png", fileSize: 102400, isRemoved: false },
    {
      id: 102,
      fileName: "outdated_log.pdf",
      fileSize: 204800,
      isRemoved: true,
      removalReason: "Uploaded wrong file",
    },
  ],
};

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
      <MemoryRouter initialEntries={["/tickets/1"]}>
        <Routes>
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
        </Routes>
      </MemoryRouter>
    </RequesterContext.Provider>
  );
};

describe("Attachment Section (TicketDetailPage)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders active attachments and shows the removal reason for soft-removed files", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(baseTicket) });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("screenshot_error.png")).toBeInTheDocument();
      expect(screen.getByText("outdated_log.pdf")).toBeInTheDocument();
      expect(screen.getByText(/Uploaded wrong file/i)).toBeInTheDocument();
    });
  });

  // AC-12: the UI must display the requester's original upload name,
  // never the internally generated storage filename.
  it("displays the original filename, not the internal storage filename", async () => {
    const ticketWithOriginalName = {
      ...baseTicket,
      attachments: [
        {
          id: 101,
          fileName: "1756812345-839201.pdf",
          originalFileName: "battery report.pdf",
          fileSize: 102400,
          isRemoved: false,
        },
      ],
    };
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: () => Promise.resolve(ticketWithOriginalName) });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("battery report.pdf")).toBeInTheDocument();
      expect(screen.queryByText("1756812345-839201.pdf")).not.toBeInTheDocument();
    });
  });

  it("gives the active attachment a download link that carries the requester id", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(baseTicket) });

    renderComponent();

    const downloadLink = await screen.findByRole("link", { name: /download/i });
    expect(downloadLink).toHaveAttribute(
      "href",
      `/api/attachments/101/download?requesterId=${mockRequester.id}`
    );
  });

  it("uploads a valid file and refreshes the attachment list", async () => {
    let uploadCalled = false;
    global.fetch = vi.fn().mockImplementation((url: string, init?: any) => {
      if (typeof url === "string" && url.includes("/attachments") && init?.method === "POST") {
        uploadCalled = true;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 103, fileName: "new_photo.png", isRemoved: false }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(baseTicket) });
    });

    renderComponent();
    await waitFor(() => expect(screen.getByText("screenshot_error.png")).toBeInTheDocument());

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const validFile = new File(["dummy"], "new_photo.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => expect(uploadCalled).toBe(true));

    const [, uploadInit] = (global.fetch as any).mock.calls.find(
      ([callUrl, callInit]: any) => callUrl.includes("/attachments") && callInit?.method === "POST"
    );
    expect(uploadInit.body).toBeInstanceOf(FormData);
    expect((uploadInit.body as FormData).get("requesterId")).toBe(String(mockRequester.id));
  });

  it("rejects a client-side invalid attachment (wrong type) without calling the API", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(baseTicket) });

    renderComponent();
    await waitFor(() => expect(screen.getByText("screenshot_error.png")).toBeInTheDocument());

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const badFile = new File(["dummy"], "malware.exe", { type: "application/x-msdownload" });
    fireEvent.change(fileInput, { target: { files: [badFile] } });

    expect(await screen.findByText(/invalid file type/i)).toBeInTheDocument();

    const uploadCalls = (global.fetch as any).mock.calls.filter(
      ([callUrl, callInit]: any) => callUrl.includes("/attachments") && callInit?.method === "POST"
    );
    expect(uploadCalls.length).toBe(0);
  });

  it("blocks upload once the active attachment limit (5) is reached", async () => {
    const fullTicket = {
      ...baseTicket,
      attachments: Array.from({ length: 5 }, (_, i) => ({
        id: 200 + i,
        fileName: `file-${i}.png`,
        fileSize: 1000,
        isRemoved: false,
      })),
    };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(fullTicket) });

    renderComponent();
    await waitFor(() => expect(screen.getByText("file-0.png")).toBeInTheDocument());

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const anotherFile = new File(["dummy"], "one-too-many.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [anotherFile] } });

    expect(await screen.findByText(/maximum limit of 5/i)).toBeInTheDocument();
  });

  it("requires a removal reason before soft-removing an attachment via the confirmation modal", async () => {
    let deleteCalled = false;
    global.fetch = vi.fn().mockImplementation((url: string, init?: any) => {
      if (typeof url === "string" && url.includes("/api/attachments/101") && init?.method === "DELETE") {
        deleteCalled = true;
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 101, isRemoved: true }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(baseTicket) });
    });

    renderComponent();
    await waitFor(() => expect(screen.getByText("screenshot_error.png")).toBeInTheDocument());

    // Open the modal, then cancel — no request should be sent.
    fireEvent.click(screen.getByRole("button", { name: /remove/i }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(deleteCalled).toBe(false);

    // Open the modal again and try to confirm with an empty reason — blocked client-side.
    fireEvent.click(screen.getByRole("button", { name: /remove/i }));
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: /confirm remove/i }));
    expect(await screen.findByText(/removal reason is required/i)).toBeInTheDocument();
    expect(deleteCalled).toBe(false);

    // Provide a reason and confirm — the request must carry it.
    fireEvent.change(screen.getByLabelText(/removal reason/i), {
      target: { value: "Uploaded incorrect file by mistake" },
    });
    fireEvent.click(screen.getByRole("button", { name: /confirm remove/i }));

    await waitFor(() => expect(deleteCalled).toBe(true));

    const [, deleteInit] = (global.fetch as any).mock.calls.find(
      ([callUrl, callInit]: any) => callUrl.includes("/api/attachments/101") && callInit?.method === "DELETE"
    );

    const body = deleteInit?.body ? JSON.parse(deleteInit.body) : {};
    expect(body.removalReason).toBe("Uploaded incorrect file by mistake");

    // ดึง requesterId จาก Header หรือ Body
    const headers = deleteInit?.headers;
    const headerRequesterId =
      headers instanceof Headers
        ? headers.get("x-requester-id")
        : headers?.["x-requester-id"] || headers?.["X-Requester-Id"];

    const actualRequesterId =
      body.requesterId !== undefined
        ? Number(body.requesterId)
        : headerRequesterId !== undefined
        ? Number(headerRequesterId)
        : undefined;

    expect(actualRequesterId).toBe(mockRequester.id);
  });

  it("does not render a download link for a soft-removed attachment", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(baseTicket) });

    renderComponent();
    await waitFor(() => expect(screen.getByText("outdated_log.pdf")).toBeInTheDocument());

    const allDownloadLinks = screen.queryAllByRole("link", { name: /download/i });
    allDownloadLinks.forEach((link) => {
      expect(link).not.toHaveAttribute("href", expect.stringContaining("/102/download"));
    });
  });
});