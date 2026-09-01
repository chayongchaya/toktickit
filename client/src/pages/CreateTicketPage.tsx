import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useRequester } from "../context/RequesterContext.js";
import {
  getCategories,
  getSystems,
  createTicket,
  uploadAttachment,
  type Category,
  type RelatedSystem,
  type Ticket,
} from "../api.js";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_ATTACHMENTS = 5;

interface UploadOutcome {
  fileName: string;
  error: string;
}

export const CreateTicketPage: React.FC = () => {
  const { currentRequester } = useRequester();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [systems, setSystems] = useState<RelatedSystem[]>([]);
  const [referenceDataError, setReferenceDataError] = useState<string | null>(null);

  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [relatedSystemId, setRelatedSystemId] = useState<number | "">("");
  const [requestedPriority, setRequestedPriority] = useState("MEDIUM");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Validation & Error States
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [fileError, setFileError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success state — shown instead of the form once the ticket is created,
  // so the generated Ticket Number is always visible (spec 8.3) and any
  // attachment failures are surfaced instead of failing silently.
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);
  const [failedUploads, setFailedUploads] = useState<UploadOutcome[]>([]);

  useEffect(() => {
    Promise.all([getCategories(), getSystems()])
      .then(([categoryData, systemData]) => {
        setCategories(categoryData);
        setSystems(systemData);
      })
      .catch((err) => {
        console.error("Error fetching reference data:", err);
        setReferenceDataError(
          err.message || "Unable to load categories and related systems. Please try again."
        );
      });
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (selectedFiles.length + files.length > MAX_ATTACHMENTS) {
      setFileError(`Cannot attach more than ${MAX_ATTACHMENTS} active files per ticket.`);
      e.target.value = "";
      return;
    }

    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        setFileError(`Invalid file format for "${file.name}". Only JPG, PNG, WEBP, and PDF files are allowed.`);
        e.target.value = "";
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setFileError(`File "${file.name}" exceeds the maximum 5 MB limit.`);
        e.target.value = "";
        return;
      }
    }

    setSelectedFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  const handleRemoveSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFileError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    const errors: { [key: string]: string } = {};

    if (!summary.trim()) {
      errors.summary = "Ticket summary is required.";
    }
    if (!description.trim()) {
      errors.description = "Ticket description is required.";
    }
    if (!categoryId) {
      errors.categoryId = "Category selection is required.";
    }
    if (!relatedSystemId) {
      errors.relatedSystemId = "Related system selection is required.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    if (!currentRequester) {
      setServerError("No Development Requester selected. Please select one before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create the ticket. createTicket() surfaces the backend's own
      // validation message (e.g. summary length) instead of a generic string.
      const ticket = await createTicket(
        {
          summary: summary.trim(),
          description: description.trim(),
          categoryId: Number(categoryId),
          relatedSystemId: Number(relatedSystemId),
          requestedPriority,
        },
        currentRequester.id
      );

      // 2. Upload attachments one by one. Failures are collected instead of
      // only logged, so the user can see exactly which files didn't make it.
      const failures: UploadOutcome[] = [];
      for (const file of selectedFiles) {
        try {
          await uploadAttachment(ticket.id, file, currentRequester.id);
        } catch (uploadErr: any) {
          failures.push({
            fileName: file.name,
            error: uploadErr.message || "Upload failed.",
          });
        }
      }

      setCreatedTicket(ticket);
      setFailedUploads(failures);
    } catch (err: any) {
      setServerError(err.message || "Network error: Service backend is unreachable.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartNewTicket = () => {
    setCreatedTicket(null);
    setFailedUploads([]);
    setSummary("");
    setDescription("");
    setCategoryId("");
    setRelatedSystemId("");
    setRequestedPriority("MEDIUM");
    setSelectedFiles([]);
  };

  // ---- Success state: shown after a ticket is created, replacing the form ----
  if (createdTicket) {
    return (
      <div style={{ backgroundColor: "#F5F7F6", minHeight: "100vh" }} className="pb-5">
        <div className="container py-4" style={{ maxWidth: 640 }}>
          <div className="card border-0 shadow-sm rounded-3 p-4 bg-white text-center">
            <div className="mb-3" style={{ fontSize: "2.5rem" }}>✅</div>
            <h1 className="h5 fw-bold text-dark mb-2">Ticket Submitted Successfully</h1>
            <p className="text-muted small mb-3">Your support ticket has been created and assigned:</p>

            <div
              className="rounded-3 p-3 mb-4"
              style={{ backgroundColor: "#EAF6EF", border: "1px solid #D2EBD9" }}
            >
              <div className="text-muted small mb-1">Ticket Number</div>
              <div className="h4 fw-bold mb-0" style={{ color: "#006B3C" }}>
                {createdTicket.ticketNumber}
              </div>
            </div>

            {failedUploads.length > 0 && (
              <div
                className="alert text-start py-2 mb-4 small"
                style={{ backgroundColor: "#FEF3C7", color: "#854D0E", border: "1px solid #FDE68A" }}
                role="alert"
              >
                <div className="fw-semibold mb-1">⚠️ Ticket created, but {failedUploads.length} file(s) did not upload:</div>
                <ul className="mb-1 ps-3">
                  {failedUploads.map((f, i) => (
                    <li key={i}>
                      <strong>{f.fileName}</strong> — {f.error}
                    </li>
                  ))}
                </ul>
                <div>You can add these files again from the Ticket Detail screen.</div>
              </div>
            )}

            <div className="d-flex justify-content-center gap-2">
              <button
                type="button"
                className="btn btn-light border btn-sm px-4 fw-semibold text-dark"
                onClick={handleStartNewTicket}
              >
                Create Another Ticket
              </button>
              <Link
                to={`/tickets/${createdTicket.id}`}
                className="btn btn-sm px-4 fw-semibold text-white"
                style={{ backgroundColor: "#006B3C" }}
              >
                View Ticket
              </Link>
              <button
                type="button"
                className="btn btn-sm px-4 fw-semibold text-white"
                style={{ backgroundColor: "#0B7A46" }}
                onClick={() => navigate("/tickets")}
              >
                Back to My Tickets
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#F5F7F6", minHeight: "100vh" }} className="pb-5">
      <div className="container py-3" style={{ maxWidth: 860 }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="small text-muted">
            <Link to="/tickets" className="fw-semibold text-decoration-none" style={{ color: "#006B3C" }}>
              My Tickets
            </Link>{" "}
            &gt; <span className="text-dark">Create Ticket</span>
          </div>
          <Link to="/tickets" className="btn btn-light border btn-sm px-3 fw-semibold text-dark">
            ← Back to My Tickets
          </Link>
        </div>

        <div className="card border-0 shadow-sm rounded-3 p-4 bg-white">
          <div className="border-bottom pb-3 mb-4">
            <h1 className="h5 fw-bold text-dark mb-1">Create Support Ticket</h1>
            <p className="text-muted small mb-0">Describe your technical issue and submit to the IT support desk.</p>
          </div>

          {/* Reference-data load failure (categories/systems) */}
          {referenceDataError && (
            <div
              className="alert py-2 mb-4 small d-flex align-items-center gap-2"
              style={{ backgroundColor: "#FDE8E8", color: "#9B1C1C", border: "1px solid #F8B4B4" }}
              role="alert"
            >
              <span>⚠️</span>
              <span>{referenceDataError}</span>
            </div>
          )}

          {/* Backend / Safe Error Banner (ticket creation failure) */}
          {serverError && (
            <div
              className="alert py-2 mb-4 small d-flex align-items-center gap-2"
              style={{ backgroundColor: "#FDE8E8", color: "#9B1C1C", border: "1px solid #F8B4B4" }}
              role="alert"
            >
              <span>⚠️</span>
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Requester Info Strip */}
            <div
              className="d-flex align-items-center justify-content-between p-3 rounded-2 mb-4"
              style={{ backgroundColor: "#EAF6EF", border: "1px solid #D2EBD9" }}
            >
              <div className="d-flex align-items-center gap-2">
                <span>👤</span>
                <span className="small text-dark">
                  Submitting as: <strong style={{ color: "#006B3C" }}>{currentRequester?.name || "Requester"}</strong> ({currentRequester?.email})
                </span>
              </div>
            </div>

            {/* Ticket Summary */}
            <div className="mb-3">
              <label htmlFor="summary" className="form-label small fw-semibold text-dark mb-1">
                Ticket Summary <span className="text-danger">*</span>
              </label>
              <input
                id="summary"
                type="text"
                className={`form-control form-control-sm ${fieldErrors.summary ? "is-invalid" : ""}`}
                placeholder="Brief summary of the issue (e.g. Cannot access VPN network)"
                value={summary}
                onChange={(e) => {
                  setSummary(e.target.value);
                  if (fieldErrors.summary) setFieldErrors((prev) => ({ ...prev, summary: "" }));
                }}
              />
              {fieldErrors.summary && (
                <div className="text-danger small mt-1" style={{ fontSize: "0.8rem" }}>
                  {fieldErrors.summary}
                </div>
              )}
            </div>

            {/* Category & Related System */}
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label htmlFor="category" className="form-label small fw-semibold text-dark mb-1">
                  Category <span className="text-danger">*</span>
                </label>
                <select
                  id="category"
                  className={`form-select form-select-sm ${fieldErrors.categoryId ? "is-invalid" : ""}`}
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value ? Number(e.target.value) : "");
                    if (fieldErrors.categoryId) setFieldErrors((prev) => ({ ...prev, categoryId: "" }));
                  }}
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {fieldErrors.categoryId && (
                  <div className="text-danger small mt-1" style={{ fontSize: "0.8rem" }}>
                    {fieldErrors.categoryId}
                  </div>
                )}
              </div>

              <div className="col-md-6">
                <label htmlFor="system" className="form-label small fw-semibold text-dark mb-1">
                  Related System <span className="text-danger">*</span>
                </label>
                <select
                  id="system"
                  className={`form-select form-select-sm ${fieldErrors.relatedSystemId ? "is-invalid" : ""}`}
                  value={relatedSystemId}
                  onChange={(e) => {
                    setRelatedSystemId(e.target.value ? Number(e.target.value) : "");
                    if (fieldErrors.relatedSystemId) setFieldErrors((prev) => ({ ...prev, relatedSystemId: "" }));
                  }}
                >
                  <option value="">Select Related System</option>
                  {systems.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {fieldErrors.relatedSystemId && (
                  <div className="text-danger small mt-1" style={{ fontSize: "0.8rem" }}>
                    {fieldErrors.relatedSystemId}
                  </div>
                )}
              </div>
            </div>

            {/* Requested Priority */}
            <div className="mb-3">
              <label htmlFor="priority" className="form-label small fw-semibold text-dark mb-1">
                Requested Priority
              </label>
              <select
                id="priority"
                className="form-select form-select-sm"
                value={requestedPriority}
                onChange={(e) => setRequestedPriority(e.target.value)}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            {/* Description */}
            <div className="mb-4">
              <label htmlFor="description" className="form-label small fw-semibold text-dark mb-1">
                Description <span className="text-danger">*</span>
              </label>
              <textarea
                id="description"
                className={`form-control form-control-sm ${fieldErrors.description ? "is-invalid" : ""}`}
                rows={4}
                placeholder="Detailed description of the issue..."
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (fieldErrors.description) setFieldErrors((prev) => ({ ...prev, description: "" }));
                }}
              />
              {fieldErrors.description && (
                <div className="text-danger small mt-1" style={{ fontSize: "0.8rem" }}>
                  {fieldErrors.description}
                </div>
              )}
            </div>

            {/* Attachments Section */}
            <div className="mb-4 pt-3 border-top">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div>
                  <label className="form-label small fw-semibold text-dark mb-0">
                    Attachments (Optional)
                  </label>
                  <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                    Max 5 files (JPG, PNG, WEBP, PDF up to 5 MB each)
                  </div>
                </div>
                <label
                  className={`btn btn-sm px-3 mb-0 fw-semibold text-white ${
                    selectedFiles.length >= MAX_ATTACHMENTS ? "opacity-50" : ""
                  }`}
                  style={{
                    backgroundColor: "#006B3C",
                    cursor: selectedFiles.length >= MAX_ATTACHMENTS ? "not-allowed" : "pointer",
                  }}
                >
                  + Add File
                  <input
                    type="file"
                    hidden
                    multiple
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    disabled={selectedFiles.length >= MAX_ATTACHMENTS}
                    onChange={handleFileSelect}
                  />
                </label>
              </div>

              {fileError && (
                <div
                  className="alert py-2 mb-2 small d-flex align-items-center gap-2"
                  style={{ backgroundColor: "#FDE8E8", color: "#9B1C1C", border: "1px solid #F8B4B4" }}
                >
                  <span>⚠️</span>
                  <span>{fileError}</span>
                </div>
              )}

              {selectedFiles.length > 0 ? (
                <div className="bg-light rounded-3 p-2 border">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="d-flex justify-content-between align-items-center py-2 px-2 border-bottom bg-white rounded mb-1"
                    >
                      <div className="d-flex align-items-center gap-2">
                        <span>📄</span>
                        <span className="small fw-medium text-dark">{file.name}</span>
                        <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-link text-danger text-decoration-none small p-0"
                        onClick={() => handleRemoveSelectedFile(idx)}
                      >
                        ✕ Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted small fst-italic p-2 bg-light rounded-2 border">
                  No files selected.
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="d-flex justify-content-end gap-2 pt-3 border-top">
              <button
                type="button"
                className="btn btn-light border btn-sm px-4 fw-semibold text-muted"
                onClick={() => navigate("/tickets")}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-sm px-4 fw-semibold text-white d-flex align-items-center gap-2"
                style={{ backgroundColor: "#006B3C" }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <span>Submitting...</span>
                  </>
                ) : (
                  "Submit Ticket"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};