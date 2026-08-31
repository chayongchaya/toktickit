import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useRequester } from "../context/RequesterContext.js";

interface AttachmentItem {
  id: number;
  fileName: string;
  fileSize: number;
  isRemoved?: boolean;
  removalReason?: string | null;
}

interface TicketDetail {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  resolutionSummary?: string | null;
  currentStatus: string;
  requestedPriority: string;
  itPriority: string;
  createdAt: string;
  updatedAt: string;
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  requester: { id: number; name: string; email: string };
  attachments: AttachmentItem[];
}

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_ACTIVE_ATTACHMENTS = 5;

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentRequester } = useRequester();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "comments" | "attachments" | "actions" | "logs"
  >("attachments");

  const fetchTicketDetails = () => {
    if (!currentRequester) return;
    setLoading(true);
    fetch(`/api/tickets/${id}?requesterId=${currentRequester.id}`)
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Ticket not found");
        }
        return res.json();
      })
      .then((data) => setTicket(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTicketDetails();
  }, [id, currentRequester]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !ticket) return;

    // 1. ตรวจสอบจำนวนไฟล์ที่ Active ไม่เกิน 5 ไฟล์
    const currentActiveCount =
      ticket.attachments?.filter((a) => !a.isRemoved).length || 0;
    if (currentActiveCount >= MAX_ACTIVE_ATTACHMENTS) {
      alert(
        "Cannot upload: Maximum limit of 5 active attachments reached for this ticket."
      );
      e.target.value = "";
      return;
    }

    // 2. ตรวจสอบประเภทไฟล์ที่อนุญาต
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      alert(
        "Invalid file type! Allowed formats: JPG, JPEG, PNG, WEBP, and PDF only."
      );
      e.target.value = "";
      return;
    }

    // 3. ตรวจสอบขนาดไฟล์ไม่เกิน 5MB
    if (file.size > MAX_FILE_SIZE) {
      alert("File is too large! Maximum allowed size is 5 MB.");
      e.target.value = "";
      return;
    }

    // สร้าง FormData เพื่อส่งไฟล์จริงขึ้น Server
    const formData = new FormData();
    formData.append("file", file);
    if (currentRequester) {
      formData.append("requesterId", String(currentRequester.id));
    }

    try {
      const res = await fetch(`/api/tickets/${ticket.id}/attachments`, {
        method: "POST",
        body: formData, // ไม่ต้องระบุ Content-Type header เพื่อให้เบราว์เซอร์เซ็ต boundary อัตโนมัติ
      });

      if (res.ok) {
        fetchTicketDetails();
        e.target.value = "";
      } else {
        const data = await res.json();
        alert(data.error || "Failed to upload attachment");
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading attachment");
    }
  };

  const handleRemoveAttachment = async (attachmentId: number) => {
    const reason = window.prompt(
      "Please enter the reason for removing this attachment:"
    );
    if (!reason || reason.trim() === "") return;

    try {
      const res = await fetch(`/api/attachments/${attachmentId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          removalReason: reason.trim(),
          requesterId: currentRequester?.id,
        }),
      });

      if (res.ok) {
        fetchTicketDetails();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to remove attachment");
      }
    } catch (err) {
      console.error(err);
      alert("Error occurred while removing attachment");
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
          backgroundColor: "#FEF08A",
          color: "#854D0E",
          border: "1px solid #FDE047",
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

  if (loading)
    return (
      <div className="text-center py-5 text-muted">
        Loading ticket details...
      </div>
    );
  if (error || !ticket) {
    return (
      <div className="container py-5" style={{ maxWidth: 600 }}>
        <div className="alert alert-danger">{error || "Ticket not found"}</div>
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
      style={{ backgroundColor: "#F5F7F6", minHeight: "100vh" }}
      className="pb-5"
    >
      <div className="container py-3" style={{ maxWidth: 1100 }}>
        {/* Top Breadcrumb & Back Action */}
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

        {/* Read-Only Ticket Header Card */}
        <div className="card border-0 shadow-sm rounded-3 mb-4 p-4 bg-white">
          {/* Row 1 */}
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
                value={new Date(ticket.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
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

          {/* Row 2 */}
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
                style={{ minHeight: 31, border: "1px solid #dee2e6" }}
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
                style={{ minHeight: 31, border: "1px solid #dee2e6" }}
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
                style={{ minHeight: 31, border: "1px solid #dee2e6" }}
              >
                {getStatusBadge(ticket.currentStatus)}
              </div>
            </div>
          </div>

          {/* Row 3 */}
          <div className="row g-3 mb-3">
            <div className="col-md-3">
              <label className="form-label small text-muted mb-1">
                Ticket Owner
              </label>
              <input
                type="text"
                className="form-control form-control-sm bg-light"
                readOnly
                value="Unassigned"
              />
            </div>
            <div className="col-md-9">
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

          {/* Description */}
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

          {/* Resolution Summary */}
          <div>
            <label className="form-label small text-muted mb-1">
              Resolution Summary
            </label>
            <input
              type="text"
              className="form-control form-control-sm bg-light text-muted fst-italic"
              readOnly
              value={
                ticket.resolutionSummary || "No resolution summary available yet."
              }
            />
          </div>
        </div>

        {/* Tabs & Attachments Card */}
        <div className="card border-0 shadow-sm rounded-3 bg-white">
          <div className="card-header bg-white border-bottom p-0">
            <ul className="nav nav-tabs border-0 px-3">
              <li className="nav-item">
                <button
                  className={`nav-link border-0 text-muted ${
                    activeTab === "comments"
                      ? "active border-bottom border-success border-3 fw-bold text-dark"
                      : ""
                  }`}
                  onClick={() => setActiveTab("comments")}
                >
                  💬 Public Comments{" "}
                  <span className="badge bg-secondary rounded-pill ms-1">0</span>
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link border-0 ${
                    activeTab === "attachments"
                      ? "active border-bottom border-success border-3 fw-bold text-dark"
                      : "text-muted"
                  }`}
                  style={
                    activeTab === "attachments"
                      ? { borderColor: "#006B3C" }
                      : {}
                  }
                  onClick={() => setActiveTab("attachments")}
                >
                  📎 Attachments{" "}
                  <span
                    className="badge rounded-pill ms-1"
                    style={{ backgroundColor: "#006B3C" }}
                  >
                    {activeAttachments.length}
                  </span>
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link border-0 text-muted ${
                    activeTab === "actions"
                      ? "active border-bottom border-success border-3 fw-bold text-dark"
                      : ""
                  }`}
                  onClick={() => setActiveTab("actions")}
                >
                  🛠 Service Actions{" "}
                  <span className="badge bg-secondary rounded-pill ms-1">0</span>
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link border-0 text-muted ${
                    activeTab === "logs"
                      ? "active border-bottom border-success border-3 fw-bold text-dark"
                      : ""
                  }`}
                  onClick={() => setActiveTab("logs")}
                >
                  ⏱ Event Log{" "}
                  <span className="badge bg-secondary rounded-pill ms-1">0</span>
                </button>
              </li>
            </ul>
          </div>

          <div className="card-body p-4">
            {activeTab === "attachments" && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold mb-0 text-dark">Attached Files</h6>
                  <label
                    className="btn btn-sm text-white px-3 mb-0 fw-semibold"
                    style={{ backgroundColor: "#006B3C", cursor: "pointer" }}
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
                            {att.fileName}
                          </span>
                        </div>
                        <div className="d-flex align-items-center gap-4">
                          <span className="text-muted small">File type</span>
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
                            className="btn btn-link text-danger text-decoration-none small p-0"
                            onClick={() => handleRemoveAttachment(att.id)}
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
                    <h6 className="fw-bold mb-3 text-muted">Removed Files</h6>
                    {removedAttachments.map((att) => (
                      <div
                        key={att.id}
                        className="d-flex justify-content-between align-items-center py-2 border-bottom text-muted small"
                      >
                        <div className="d-flex align-items-center gap-2">
                          <span>📄</span>
                          <span className="text-decoration-line-through">
                            {att.fileName}
                          </span>
                        </div>
                        <div className="text-danger">
                          Removal reason:{" "}
                          {att.removalReason || "Removed by requester"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab !== "attachments" && (
              <div className="text-center py-4 text-muted small fst-italic">
                This section will be implemented in later labs.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};