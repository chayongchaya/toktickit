import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TicketDetailPage } from "../../src/pages/TicketDetailPage";

// Covers: AC-04 (attachment restrictions), AC-05 (soft removal + reason required,
// blocked download), AC-12 (original filename display), section 4.5 attachment rules.
//
// Lab 3 (BR-32/BR-03, docs/lab-03/tests.md MIG-03): the Development Requester
// selector and RequesterContext are removed, so this file mocks useAuth()
// instead of wrapping the component in RequesterContext.Provider. The
// download link and upload/delete requests no longer carry a requesterId
// (query param, form field, or header) — the session cookie
// (credentials: "include") is the only identity signal now (BR-03).

const { mockUser } = vi.hoisted(() => ({
  mockUser: {
    id: 1,
    name: "Jennifer Anderson",
    email: "jennifer@example.com",
    role: "REQUESTER",
    mustChangePassword: false,
  },
}));

vi.mock("../../src/context/AuthContext.js", () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    markPasswordChanged: vi.fn(),
  }),
}));


// TicketDetailPage also fetches Public Comments via a separate endpoint
// (GET /api/tickets/:id/comments). These attachment-focused tests don't
// care about comments, so this helper always answers that call with an
// empty array, keeping the ticket-detail mock focused on attachments.
function withComments(fetchImpl: (url: string, init?: any) => Promise<any>) {
  return vi.fn().mockImplementation((url: string, init?: any) => {
    if (typeof url === "string" && url.includes("/comments")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }
    return fetchImpl(url, init);
  });
}

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
    <MemoryRouter initialEntries={["/tickets/1"]}>
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetailPage />} />
      </Routes>
    </MemoryRouter>
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
    global.fetch = withComments(() => Promise.resolve({ ok: true, json: () => Promise.resolve(baseTicket) }));

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
    global.fetch = withComments(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(ticketWithOriginalName) })
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("battery report.pdf")).toBeInTheDocument();
      expect(screen.queryByText("1756812345-839201.pdf")).not.toBeInTheDocument();
    });
  });

  it("gives the active attachment a working download link", async () => {
    global.fetch = withComments(() => Promise.resolve({ ok: true, json: () => Promise.resolve(baseTicket) }));

    renderComponent();

    const downloadLink = await screen.findByRole("link", { name: /download/i });
    // BR-03: ownership is enforced server-side via the session cookie sent
    // with the download request, not a client-supplied requesterId param.
    expect(downloadLink).toHaveAttribute("href", "/api/attachments/101/download");
  });

  it("uploads a valid file with the session cookie and refreshes the attachment list", async () => {
    let uploadCalled = false;
    let uploadInit: any = null;
    global.fetch = vi.fn().mockImplementation((url: string, init?: any) => {
      if (typeof url === "string" && url.includes("/attachments") && init?.method === "POST") {
        uploadCalled = true;
        uploadInit = init;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 103, fileName: "new_photo.png", isRemoved: false }),
        });
      }
      if (typeof url === "string" && url.includes("/comments")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(baseTicket) });
    });

    renderComponent();
    await waitFor(() => expect(screen.getByText("screenshot_error.png")).toBeInTheDocument());

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const validFile = new File(["dummy"], "new_photo.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => expect(uploadCalled).toBe(true));

    expect(uploadInit.body).toBeInstanceOf(FormData);
    expect((uploadInit.body as FormData).get("file")).not.toBeNull();
    expect(uploadInit.credentials).toBe("include");
  });

  it("rejects a client-side invalid attachment (wrong type) without calling the API", async () => {
    global.fetch = withComments(() => Promise.resolve({ ok: true, json: () => Promise.resolve(baseTicket) }));

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
    global.fetch = withComments(() => Promise.resolve({ ok: true, json: () => Promise.resolve(fullTicket) }));

    renderComponent();
    await waitFor(() => expect(screen.getByText("file-0.png")).toBeInTheDocument());

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const anotherFile = new File(["dummy"], "one-too-many.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [anotherFile] } });

    expect(await screen.findByText(/maximum limit of 5/i)).toBeInTheDocument();
  });

  it("requires a removal reason before soft-removing an attachment via the confirmation modal", async () => {
    let deleteCalled = false;
    let deleteInit: any = null;
    global.fetch = vi.fn().mockImplementation((url: string, init?: any) => {
      if (typeof url === "string" && url.includes("/api/attachments/101") && init?.method === "DELETE") {
        deleteCalled = true;
        deleteInit = init;
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 101, isRemoved: true }) });
      }
      if (typeof url === "string" && url.includes("/comments")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
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

    const body = deleteInit?.body ? JSON.parse(deleteInit.body) : {};
    expect(body.removalReason).toBe("Uploaded incorrect file by mistake");
    // BR-03: ownership is derived from the session cookie, not a
    // client-supplied requesterId (body field or header).
    expect(body.requesterId).toBeUndefined();
    expect(deleteInit.credentials).toBe("include");
  });

  it("does not render a download link for a soft-removed attachment", async () => {
    global.fetch = withComments(() => Promise.resolve({ ok: true, json: () => Promise.resolve(baseTicket) }));

    renderComponent();
    await waitFor(() => expect(screen.getByText("outdated_log.pdf")).toBeInTheDocument());

    const allDownloadLinks = screen.queryAllByRole("link", { name: /download/i });
    allDownloadLinks.forEach((link) => {
      expect(link).not.toHaveAttribute("href", expect.stringContaining("/102/download"));
    });
  });
});
