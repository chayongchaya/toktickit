import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ApiError, getInternalNotes, getPublicComments, getStaffOwners, getStaffTicket, InternalNote,
  postInternalNote, postPublicComment, PublicComment, RequesterUser, Ticket,
  updateStaffTicketOwner, updateStaffTicketPriority, updateStaffTicketStatus,
} from "../../api.js";
import { useAuth } from "../../context/AuthContext.js";

const STATUSES = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];
const TRANSITIONS: Record<string, string[]> = {
  NEW: ["OPEN", "IN_PROGRESS", "CANCELLED"], OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"], WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"], CLOSED: ["REOPENED"], REOPENED: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"], CANCELLED: [],
};

const priorityTokens: Record<string, React.CSSProperties> = {
  HIGH: { backgroundColor: "#F8B4B4", color: "#9B1C1C", border: "1px solid #F8B4B4" },
  MEDIUM: { backgroundColor: "#FDE047", color: "#854D0E", border: "1px solid #FDE047" },
  LOW: { backgroundColor: "#BCF0DA", color: "#03543F", border: "1px solid #BCF0DA" },
};
const statusTokens: Record<string, React.CSSProperties> = {
  NEW: { backgroundColor: "#F3F4F6", color: "#374151", border: "1px solid #D1D5DB" }, OPEN: { backgroundColor: "#DBEAFE", color: "#1E40AF", border: "1px solid #93C5FD" },
  IN_PROGRESS: { backgroundColor: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" }, WAITING_FOR_REQUESTER: { backgroundColor: "#F3E8FF", color: "#6B21A8", border: "1px solid #E9D5FF" },
  RESOLVED: { backgroundColor: "#EAF6EF", color: "#006B3C", border: "1px solid #A7D7B8" }, CLOSED: { backgroundColor: "#E5E7EB", color: "#1F2937", border: "1px solid #9CA3AF" }, REOPENED: { backgroundColor: "#FFEDD5", color: "#9A3412", border: "1px solid #FDBA74" }, CANCELLED: { backgroundColor: "#FEE2E2", color: "#991B1B", border: "1px solid #FCA5A5" },
};
const priorityBadge = (value?: string) => <span className="badge rounded-pill px-3 py-1 fw-normal" style={priorityTokens[value ?? ""] ?? priorityTokens.MEDIUM}>{value ?? "-"}</span>;
const formatStatus = (value: string) => value.replaceAll("_", " ");
const formatDate = (value: string) => new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

export const StaffTicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [owners, setOwners] = useState<RequesterUser[]>([]);
  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [activeTab, setActiveTab] = useState("comments");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true); setError(null);
    Promise.all([getStaffTicket(id), getStaffOwners(), getInternalNotes(id), getPublicComments(id)])
      .then(([loadedTicket, loadedOwners, loadedNotes, loadedComments]) => { if (!cancelled) { setTicket(loadedTicket); setOwners(loadedOwners); setNotes(loadedNotes); setComments(loadedComments); } })
      .catch((err: unknown) => { if (!cancelled) setError(err instanceof ApiError && err.status === 404 ? "Ticket not found." : "Unable to load staff ticket detail."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const nextStatuses = useMemo(() => ticket ? TRANSITIONS[ticket.currentStatus] ?? [] : [], [ticket]);
  const save = async (kind: "owner" | "priority" | "status", label: string, action: () => Promise<Ticket>) => {
    setSaving(kind); setFieldError(null); setSuccess(null);
    try { setTicket(await action()); setSuccess(`${label} saved.`); }
    catch (err) { setFieldError(err instanceof ApiError && err.status === 409 ? err.message : "Unable to save this change."); }
    finally { setSaving(null); }
  };

  const handleComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id) return;
    if (!commentDraft.trim()) { setCommentError("Comment cannot be empty."); return; }
    setPosting(true); setCommentError(null);
    try { const comment = await postPublicComment(id, commentDraft.trim()); setComments((current) => [...current, comment]); setCommentDraft(""); setSuccess("Public comment posted."); }
    catch (err) { setCommentError(err instanceof Error ? err.message : "Unable to post public comment."); }
    finally { setPosting(false); }
  };

  const handleNote = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id) return;
    if (!noteDraft.trim()) { setNoteError("Note cannot be empty."); return; }
    setPosting(true); setNoteError(null);
    try { const note = await postInternalNote(id, noteDraft.trim()); setNotes((current) => [...current, note]); setNoteDraft(""); setSuccess("Internal note saved."); }
    catch (err) { setNoteError(err instanceof Error ? err.message : "Unable to post internal note."); }
    finally { setPosting(false); }
  };

  if (loading) return <div className="text-center py-5 text-muted">Loading ticket detail...</div>;
  if (error || !ticket) return <div><div className="alert alert-danger" role="alert">{error ?? "Ticket not found."}</div><Link to="/queue" className="btn btn-light border">Back to Queue</Link></div>;

  return <div style={{ backgroundColor: "#F5F7F6", minHeight: "100vh" }} className="pb-5"><div className="container py-4" style={{ maxWidth: 1100 }}>
    <div className="d-flex justify-content-between align-items-center mb-4"><div><Link to="/queue" className="small text-decoration-none" style={{ color: "#006B3C" }}>← Back to Queue</Link><h1 className="h4 fw-bold mt-2 mb-1">{ticket.ticketNumber}</h1><p className="text-muted small mb-0">Staff Ticket Detail</p></div>{ticket.currentStatus && <span className="badge rounded-pill px-3 py-2" style={statusTokens[ticket.currentStatus] ?? statusTokens.NEW}>{formatStatus(ticket.currentStatus)}</span>}</div>
    {fieldError && <div className="alert alert-danger py-2 small" role="alert">{fieldError}</div>}
    {success && <div className="alert alert-success py-2 small" role="status">{success}</div>}
    <div className="card border-0 shadow-sm rounded-3 p-4 bg-white mb-4"><h2 className="h6 fw-bold mb-3">Ticket Information</h2><div className="row g-3">
      <div className="col-md-6"><div className="small text-muted">Summary</div><div className="fw-semibold">{ticket.summary}</div></div><div className="col-md-6"><div className="small text-muted">Requester</div><div>{ticket.requester?.name ?? "-"}</div></div>
      <div className="col-md-4"><div className="small text-muted">Category</div><div>{ticket.category?.name ?? "-"}</div></div><div className="col-md-4"><div className="small text-muted">Requested Priority</div><div>{priorityBadge(ticket.requestedPriority)}</div></div><div className="col-md-4"><div className="small text-muted">Created</div><div>{formatDate(ticket.createdAt)}</div></div>
      <div className="col-12"><div className="small text-muted">Description</div><div className="text-break">{ticket.description}</div></div>
    </div></div>
    <div className="card border-0 shadow-sm rounded-3 p-4 bg-white mb-4"><h2 className="h6 fw-bold mb-3">Ticket Operations</h2><div className="row g-3">
      <div className="col-md-4"><label htmlFor="ticket-owner" className="form-label small fw-semibold">Ticket Owner</label><select id="ticket-owner" className="form-select form-select-sm" value={ticket.ownerId ?? ""} disabled={saving === "owner"} onChange={(event) => { const ownerId = Number(event.target.value); if (ownerId) void save("owner", "Owner", () => updateStaffTicketOwner(ticket.id, ownerId)); }}><option value="">Unassigned</option>{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}</select>{!ticket.ownerId && user && <button type="button" className="btn btn-sm btn-light border mt-2" onClick={() => void save("owner", "Owner", () => updateStaffTicketOwner(ticket.id, user.id))}>Claim for myself</button>}</div>
      <div className="col-md-4"><label htmlFor="it-priority" className="form-label small fw-semibold">IT Priority</label><select id="it-priority" className="form-select form-select-sm" value={ticket.itPriority ?? ticket.requestedPriority} disabled={saving === "priority"} onChange={(event) => void save("priority", "IT Priority", () => updateStaffTicketPriority(ticket.id, event.target.value))}>{["LOW", "MEDIUM", "HIGH"].map((value) => <option key={value}>{value}</option>)}</select></div>
      <div className="col-md-4"><label htmlFor="current-status" className="form-label small fw-semibold">Current Status</label><select id="current-status" className="form-select form-select-sm" value="" disabled={saving === "status" || nextStatuses.length === 0} onChange={(event) => void save("status", "Status", () => updateStaffTicketStatus(ticket.id, event.target.value))}><option value="">Choose next status</option>{nextStatuses.map((value) => <option key={value} value={value}>{formatStatus(value)}</option>)}</select><div className="small text-muted mt-1">Allowed next values only</div></div>
    </div></div>
    <div className="card border-0 shadow-sm rounded-3 bg-white mb-4"><div className="p-3 border-bottom"><div className="nav nav-tabs" role="tablist">{[["comments", "Public Comments"], ["notes", "🔒 Internal Notes"], ["attachments", `Attachments (${(ticket.attachments ?? []).filter((attachment) => !attachment.isRemoved).length})`], ["actions", "Service Actions"]].map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={activeTab === key} className={`nav-link ${activeTab === key ? "active" : ""}`} onClick={() => setActiveTab(key)}>{label}</button>)}</div></div><div className="p-4">
      {activeTab === "comments" && <><h2 className="visually-hidden">Public Comments</h2>{comments.length ? comments.map((comment) => <div key={comment.id} className="border-bottom py-2"><div className="small fw-semibold">{comment.author.name} <span className="text-muted fw-normal">· {formatDate(comment.createdAt)}</span></div><div className="small text-break">{comment.content}</div></div>) : <div className="text-center py-3 text-muted">No comments yet.</div>}<form className="mt-3" onSubmit={handleComment}><label htmlFor="public-comment" className="form-label small fw-semibold">Add Public Comment</label><textarea id="public-comment" className="form-control form-control-sm" rows={3} value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} disabled={posting} />{commentError && <div className="text-danger small mt-1">{commentError}</div>}<button type="submit" className="btn btn-sm text-white mt-2" style={{ backgroundColor: "#006B3C" }} disabled={posting}>{posting ? "Posting..." : "Post Comment"}</button></form></>}
      {activeTab === "notes" && <div style={{ backgroundColor: "#FEFBEA", margin: "-1rem", padding: "1rem" }}><h2 className="h6 fw-bold">🔒 Internal Notes</h2>{notes.length ? notes.map((note) => <div key={note.id} className="border-bottom py-2"><div className="small fw-semibold">{note.author.name} <span className="text-muted fw-normal">· {formatDate(note.createdAt)}</span></div><div className="small text-break">{note.content}</div></div>) : <div className="text-center py-3 text-muted">No internal notes yet.</div>}<form className="mt-3" onSubmit={handleNote}><label htmlFor="internal-note" className="form-label small fw-semibold">Add Internal Note</label><textarea id="internal-note" className="form-control form-control-sm" rows={3} value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} disabled={posting} />{noteError && <div className="text-danger small mt-1">{noteError}</div>}<button type="submit" className="btn btn-sm text-white mt-2" style={{ backgroundColor: "#006B3C" }} disabled={posting}>{posting ? "Saving..." : "Add Note"}</button></form></div>}
      {activeTab === "attachments" && <><h2 className="h6 fw-bold">Attachments</h2>{(ticket.attachments ?? []).filter((attachment) => !attachment.isRemoved).length ? <div className="list-group list-group-flush">{(ticket.attachments ?? []).filter((attachment) => !attachment.isRemoved).map((attachment) => <a key={attachment.id} className="list-group-item list-group-item-action px-0" href={`/api/attachments/${attachment.id}/download`} download>{attachment.originalFileName || attachment.fileName} <span className="text-muted small">({Math.ceil(attachment.fileSize / 1024)} KB)</span></a>)}</div> : <div className="text-center py-5 text-muted">No attachments.</div>}</>}
      {activeTab === "actions" && <div className="text-center py-5 text-muted"><h2 className="h6">Service Actions</h2><p className="mb-0">Coming in Lab 4.</p></div>}
    </div></div>
  </div></div>;
};
