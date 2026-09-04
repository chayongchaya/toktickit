import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useRequester } from "../context/RequesterContext.js";
import {
  deleteAttachment,
  getTicketById,
  uploadAttachment,
  type Ticket,
} from "../api";

interface AttachmentItem {
  id: number;
  fileName: string; // internal storage filename — never displayed to the user
  originalFileName?: string; // requester's original upload name — display this instead
  fileSize: number;
  isRemoved?: boolean;
  removalReason?: string | null;
}

// Always prefer the requester's original filename. Falls back to the
// internal storage name only for legacy rows where originalFileName
// somehow ended up empty, so the UI never renders a blank label.
const displayFileName = (att: AttachmentItem): string =>
  att.originalFileName || att.fileName;

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ACTIVE_ATTACHMENTS = 5;

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentRequester } = useRequester();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] =
    useState<AttachmentItem | null>(null);
  const [removeReason, setRemoveReason] = useState("");
  const [removeReasonError, setRemoveReasonError] =
    useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const fetchTicketDetails = async (
    isActive: () => boolean = () => true
  ) => {
    if (!currentRequester || !id) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getTicketById(id, currentRequester.id);

      if (isActive()) {
        setTicket(data);
      }
    } catch (err) {
      if (!isActive()) return;

      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch ticket detail."
      );
      setTicket(null);
    } finally {
      if (isActive()) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    let cancelled = false;

    fetchTicketDetails(() => !cancelled);

    return () => {
      cancelled = true;
    };
  }, [id, currentRequester]);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file || !ticket) return;

    setAttachmentError(null);

    const currentActiveCount =
      ticket.attachments?.filter((a) => !a.isRemoved).length || 0;

    if (currentActiveCount >= MAX_ACTIVE_ATTACHMENTS) {
      setAttachmentError(
        "Cannot upload: Maximum limit of 5 active attachments reached for this ticket."
      );
      e.target.value = "";
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setAttachmentError(
        "Invalid file type! Allowed formats: JPG, JPEG, PNG, WEBP, and PDF only."
      );
      e.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setAttachmentError(
        "File is too large! Maximum allowed size is 5 MB."
      );
      e.target.value = "";
      return;
    }

    try {
      if (!currentRequester) return;

      await uploadAttachment(
        ticket.id,
        file,
        currentRequester.id
      );

      await fetchTicketDetails();

      e.target.value = "";
    } catch (err) {
      console.error(err);

      setAttachmentError(
        err instanceof Error
          ? err.message
          : "Failed to upload attachment"
      );

      e.target.value = "";
    }
  };

  const openRemoveModal = (attachment: AttachmentItem) => {
    setAttachmentError(null);
    setRemoveReason("");
    setRemoveReasonError(null);
    setRemoveTarget(attachment);
  };

  const closeRemoveModal = () => {
    if (isRemoving) return;

    setRemoveTarget(null);
    setRemoveReason("");
    setRemoveReasonError(null);
  };

  const confirmRemoveAttachment = async () => {
    if (!removeTarget || !currentRequester) return;

    const trimmedReason = removeReason.trim();

    if (!trimmedReason) {
      setRemoveReasonError("A removal reason is required.");
      return;
    }

    setIsRemoving(true);
    setRemoveReasonError(null);

    try {
      await deleteAttachment(
        removeTarget.id,
        trimmedReason,
        currentRequester.id
      );

      setRemoveTarget(null);
      setRemoveReason("");

      await fetchTicketDetails();
    } catch (err) {
      console.error(err);

      setAttachmentError(
        "Failed to remove attachment. Please try again."
      );

      setRemoveTarget(null);
    } finally {
      setIsRemoving(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const p = priority?.toUpperCase();

    if (p === "HIGH") {
      return (
        <span
          className="badge rounded-pill px-3 py-1 fw-normal"
          style={{
            backgroundColor: "#FDE8E8",
            color: "#9B1C1C",
            border: "1px solid #F8B4B4",
            fontSize: "0.78rem",
          }}
        >
          High
        </span>
      );
    }

    if (p === "LOW") {
      return (
        <span
          className="badge rounded-pill px-3 py-1 fw-normal"
          style={{
            backgroundColor: "#DEF7EC",
            color: "#03543F",
            border: "1px solid #BCF0DA",
            fontSize: "0.78rem",
          }}
        >
          Low
        </span>
      );
    }

    return (
      <span
        className="badge rounded-pill px-3 py-1 fw-normal"
        style={{
          backgroundColor: "#FEF3C7",
          color: "#854D0E",
          border: "1px solid #FDE68A",
          fontSize: "0.78rem",
        }}
      >
        Medium
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toUpperCase();

    if (s === "RESOLVED") {
      return (
        <span
          className="badge rounded-pill px-3 py-1 fw-normal"
          style={{
            backgroundColor: "#DEF7EC",
            color: "#03543F",
            border: "1px solid #BCF0DA",
            fontSize: "0.78rem",
          }}
        >
          Resolved
        </span>
      );
    }

    if (s === "OPEN") {
      return (
        <span
          className="badge rounded-pill px-3 py-1 fw-normal"
          style={{
            backgroundColor: "#EBF5FF",
            color: "#1E429F",
            border: "1px solid #C3DDFD",
            fontSize: "0.78rem",
          }}
        >
          Open
        </span>
      );
    }

    if (s === "IN PROGRESS" || s === "IN_PROGRESS") {
      return (
        <span
          className="badge rounded-pill px-3 py-1 fw-normal"
          style={{
            backgroundColor: "#DEF7EC",
            color: "#03543F",
            border: "1px solid #BCF0DA",
            fontSize: "0.78rem",
          }}
        >
          In Progress
        </span>
      );
    }

    return (
      <span
        className="badge rounded-pill px-3 py-1 fw-normal"
        style={{
          backgroundColor: "#DEF7EC",
          color: "#03543F",
          border: "1px solid #BCF0DA",
          fontSize: "0.78rem",
        }}
      >
        New
      </span>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-5 text-muted">
        Loading ticket details...
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="container py-5" style={{ maxWidth: 600 }}>
        <div className="alert alert-danger">
          {error || "Ticket not found"}
        </div>

        <button
          className="btn btn-outline-secondary"
          onClick={() => navigate("/tickets")}
        >
          ← Back to My Tickets
        </button>
      </div>
    );
  }

  const activeAttachments =
    ticket.attachments?.filter((a) => !a.isRemoved) || [];

  const removedAttachments =
    ticket.attachments?.filter((a) => a.isRemoved) || [];

  return (
    <div
      style={{
        backgroundColor: "#F5F7F6",
        minHeight: "100vh",
      }}
      className="pb-5"
    >
      <div
        className="container py-3"
        style={{ maxWidth: 1100 }}
      >
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="small text-muted">
            <Link
              to="/tickets"
              className="fw-semibold text-decoration-none"
              style={{ color: "#006B3C" }}
            >
              My Tickets
            </Link>{" "}
            &gt; <span className="text-dark">Ticket Details</span>
          </div>

          <Link
            to="/tickets"
            className="btn btn-light border btn-sm px-3 fw-semibold text-dark"
          >
            ← Back to My Tickets
          </Link>
        </div>

        <div className="card border-0 shadow-sm rounded-3 mb-4 p-4 bg-white">
          <div className="row g-3 mb-3">
            <div className="col-md-3">
              <label className="form-label small text-muted mb-1">
                Ticket No.
              </label>
              <input
                type="text"
                className="form-control form-control-sm bg-light"
                readOnly
                value={ticket.ticketNumber}
              />
            </div>

            <div className="col-md-3">
              <label className="form-label small text-muted mb-1">
                Ticket Date
              </label>
              <input
                type="text"
                className="form-control form-control-sm bg-light"
                readOnly
                value={new Date(ticket.createdAt).toLocaleDateString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                )}
              />
            </div>

            <div className="col-md-3">
              <label className="form-label small text-muted mb-1">
                Category
              </label>
              <input
                type="text"
                className="form-control form-control-sm bg-light"
                readOnly
                value={ticket.category?.name || "-"}
              />
            </div>

            <div className="col-md-3">
              <label className="form-label small text-muted mb-1">
                Related System
              </label>
              <input
                type="text"
                className="form-control form-control-sm bg-light"
                readOnly
                value={ticket.relatedSystem?.name || "-"}
              />
            </div>
          </div>

          <div className="row g-3 mb-3 align-items-center">
            <div className="col-md-3">
              <label className="form-label small text-muted mb-1">
                Requester
              </label>
              <input
                type="text"
                className="form-control form-control-sm bg-light"
                readOnly
                value={ticket.requester?.name || "-"}
              />
            </div>

            <div className="col-md-3">
              <label className="form-label small text-muted mb-1 d-block">
                Requested Priority
              </label>
              <div
                className="bg-light rounded-2 p-1 d-flex align-items-center justify-content-center"
                style={{
                  minHeight: 31,
                  border: "1px solid #dee2e6",
                }}
              >
                {getPriorityBadge(ticket.requestedPriority)}
              </div>
            </div>

            <div className="col-md-3">
              <label className="form-label small text-muted mb-1 d-block">
                IT Priority
              </label>
              <div
                className="bg-light rounded-2 p-1 d-flex align-items-center justify-content-center"
                style={{
                  minHeight: 31,
                  border: "1px solid #dee2e6",
                }}
              >
                {getPriorityBadge(
                  ticket.itPriority || ticket.requestedPriority
                )}
              </div>
            </div>

            <div className="col-md-3">
              <label className="form-label small text-muted mb-1 d-block">
                Current Status
              </label>
              <div
                className="bg-light rounded-2 p-1 d-flex align-items-center justify-content-center"
                style={{
                  minHeight: 31,
                  border: "1px solid #dee2e6",
                }}
              >
                {getStatusBadge(ticket.currentStatus)}
              </div>
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-12">
              <label className="form-label small text-muted mb-1">
                Summary
              </label>
              <input
                type="text"
                className="form-control form-control-sm bg-light"
                readOnly
                value={ticket.summary}
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label small text-muted mb-1">
              Description
            </label>
            <textarea
              className="form-control form-control-sm bg-light"
              rows={2}
              readOnly
              value={ticket.description}
            />
          </div>
        </div>

        <div className="card border-0 shadow-sm rounded-3 bg-white">
          <div className="card-header bg-white border-bottom px-4 py-3">
            <div className="d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0 text-dark">
                Attachments
              </h6>
              <span
                className="badge rounded-pill"
                style={{ backgroundColor: "#006B3C" }}
              >
                {activeAttachments.length}
              </span>
            </div>
          </div>

          <div className="card-body p-4">
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0 text-dark">
                  Attached Files
                </h6>

                <label
                  className="btn btn-sm text-white px-3 mb-0 fw-semibold"
                  style={{
                    backgroundColor: "#006B3C",
                    cursor: "pointer",
                  }}
                >
                  + Add Attachment

                  <input
                    type="file"
                    hidden
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>

              {attachmentError && (
                <div
                  className="alert py-2 mb-3 small d-flex align-items-center gap-2"
                  style={{
                    backgroundColor: "#FDE8E8",
                    color: "#9B1C1C",
                    border: "1px solid #F8B4B4",
                  }}
                  role="alert"
                >
                  <span>⚠️</span>
                  <span>{attachmentError}</span>
                </div>
              )}

              {activeAttachments.length > 0 ? (
                <div className="mb-4">
                  {activeAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="d-flex justify-content-between align-items-center py-2 border-bottom"
                    >
                      <div className="d-flex align-items-center gap-2">
                        <span>📄</span>
                        <span className="fw-medium text-dark">
                          {displayFileName(att)}
                        </span>
                      </div>

                      <div className="d-flex align-items-center gap-4">
                        <span className="text-muted small">
                          File type
                        </span>

                        <span className="text-muted small">
                          {(att.fileSize / 1024).toFixed(2)} KB
                        </span>

                        <a
                          href={`/api/attachments/${att.id}/download?requesterId=${currentRequester?.id}`}
                          className="text-decoration-none small fw-semibold"
                          style={{ color: "#006B3C" }}
                          download
                        >
                          📥 Download
                        </a>

                        <button
                          type="button"
                          className="btn btn-link text-danger text-decoration-none small p-0"
                          onClick={() => openRemoveModal(att)}
                        >
                          🗑 Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted small fst-italic mb-4">
                  No attachments uploaded for this ticket.
                </p>
              )}

              {removedAttachments.length > 0 && (
                <div className="mt-4 pt-3 border-top">
                  <h6 className="fw-bold mb-3 text-muted">
                    Removed Files
                  </h6>

                  {removedAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="d-flex justify-content-between align-items-center py-2 border-bottom text-muted small"
                    >
                      <div className="d-flex align-items-center gap-2">
                        <span>📄</span>
                        <span className="text-decoration-line-through">
                          {displayFileName(att)}
                        </span>
                      </div>

                      <div className="text-danger">
                        Removal reason:{" "}
                        {att.removalReason ||
                          "Removed by requester"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {removeTarget && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            zIndex: 1050,
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-attachment-title"
          onClick={closeRemoveModal}
        >
          <div
            className="card border-0 shadow rounded-3 bg-white"
            style={{
              maxWidth: 440,
              width: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-body p-4">
              <h6
                id="remove-attachment-title"
                className="fw-bold text-dark mb-1"
              >
                Remove Attachment
              </h6>

              <p className="text-muted small mb-3">
                Removing{" "}
                <strong>{displayFileName(removeTarget)}</strong> is a
                soft removal. Its metadata will remain visible,
                but it can no longer be downloaded. Please
                provide a reason.
              </p>

              <label
                htmlFor="removal-reason"
                className="form-label small fw-semibold text-dark mb-1"
              >
                Removal Reason{" "}
                <span className="text-danger">*</span>
              </label>

              <textarea
                id="removal-reason"
                className={`form-control form-control-sm ${
                  removeReasonError ? "is-invalid" : ""
                }`}
                rows={3}
                placeholder="e.g. Uploaded the wrong file by mistake"
                value={removeReason}
                onChange={(e) => {
                  setRemoveReason(e.target.value);

                  if (removeReasonError) {
                    setRemoveReasonError(null);
                  }
                }}
                autoFocus
              />

              {removeReasonError && (
                <div
                  className="text-danger small mt-1"
                  style={{ fontSize: "0.8rem" }}
                >
                  {removeReasonError}
                </div>
              )}

              <div className="d-flex justify-content-end gap-2 pt-4">
                <button
                  type="button"
                  className="btn btn-light border btn-sm px-3 fw-semibold text-muted"
                  onClick={closeRemoveModal}
                  disabled={isRemoving}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="btn btn-sm px-3 fw-semibold text-white d-flex align-items-center gap-2"
                  style={{ backgroundColor: "#9B1C1C" }}
                  onClick={confirmRemoveAttachment}
                  disabled={isRemoving}
                >
                  {isRemoving ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm"
                        role="status"
                        aria-hidden="true"
                      />
                      <span>Removing...</span>
                    </>
                  ) : (
                    "Confirm Remove"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};