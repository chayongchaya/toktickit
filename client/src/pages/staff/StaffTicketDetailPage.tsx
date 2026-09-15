import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ApiError, getInternalNotes, getStaffOwners, getStaffTicket, InternalNote, postInternalNote,
  RequesterUser, Ticket, updateStaffTicketOwner, updateStaffTicketPriority, updateStaffTicketStatus,
} from "../../api.js";
import { useAuth } from "../../context/AuthContext.js";

const STATUSES = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];
const TRANSITIONS: Record<string, string[]> = {
  NEW: ["OPEN", "IN_PROGRESS", "CANCELLED"], OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"], WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"], CLOSED: ["REOPENED"], REOPENED: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"], CANCELLED: [],
};

const priorityBadge = (value?: string) => <span className="badge rounded-pill px-3 py-1 fw-normal bg-light text-dark border">{value ?? "-"}</span>;
const formatStatus = (value: string) => value.replaceAll("_", " ");
const formatDate = (value: string) => new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

export const StaffTicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [owners, setOwners] = useState<RequesterUser[]>([]);
  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [postingNote, setPostingNote] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true); setError(null);
    Promise.all([getStaffTicket(id), getStaffOwners(), getInternalNotes(id)])
      .then(([loadedTicket, loadedOwners, loadedNotes]) => { if (!cancelled) { setTicket(loadedTicket); setOwners(loadedOwners); setNotes(loadedNotes); } })
      .catch((err: unknown) => { if (!cancelled) setError(err instanceof ApiError && err.status === 404 ? "Ticket not found." : "Unable to load staff ticket detail."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const nextStatuses = useMemo(() => ticket ? TRANSITIONS[ticket.currentStatus] ?? [] : [], [ticket]);
  const save = async (kind: "owner" | "priority" | "status", action: () => Promise<Ticket>) => {
    setSaving(kind); setFieldError(null);
    try { setTicket(await action()); }
    catch (err) { setFieldError(err instanceof ApiError && err.status === 409 ? err.message : "Unable to save this change."); }
    finally { setSaving(null); }
  };

  const handleNote = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id) return;
    if (!noteDraft.trim()) { setNoteError("Note cannot be empty."); return; }
    setPostingNote(true); setNoteError(null);
    try { const note = await postInternalNote(id, noteDraft.trim()); setNotes((current) => [...current, note]); setNoteDraft(""); }
    catch (err) { setNoteError(err instanceof Error ? err.message : "Unable to post internal note."); }
    finally { setPostingNote(false); }
  };

  if (loading) return <div className="text-center py-5 text-muted">Loading ticket detail...</div>;
  if (error || !ticket) return <div><div className="alert alert-danger" role="alert">{error ?? "Ticket not found."}</div><Link to="/queue" className="btn btn-light border">Back to Queue</Link></div>;

  return <div style={{ backgroundColor: "#F5F7F6", minHeight: "100vh" }} className="pb-5"><div className="container py-4" style={{ maxWidth: 1100 }}>
    <div className="d-flex justify-content-between align-items-center mb-4"><div><Link to="/queue" className="small text-decoration-none" style={{ color: "#006B3C" }}>← Back to Queue</Link><h1 className="h4 fw-bold mt-2 mb-1">{ticket.ticketNumber}</h1><p className="text-muted small mb-0">Staff Ticket Detail</p></div>{ticket.currentStatus && <span className="badge rounded-pill px-3 py-2 bg-light text-dark border">{formatStatus(ticket.currentStatus)}</span>}</div>
    {fieldError && <div className="alert alert-danger py-2 small" role="alert">{fieldError}</div>}
    <div className="card border-0 shadow-sm rounded-3 p-4 bg-white mb-4"><h2 className="h6 fw-bold mb-3">Ticket Information</h2><div className="row g-3">
      <div className="col-md-6"><div className="small text-muted">Summary</div><div className="fw-semibold">{ticket.summary}</div></div><div className="col-md-6"><div className="small text-muted">Requester</div><div>{ticket.requester?.name ?? "-"}</div></div>
      <div className="col-md-4"><div className="small text-muted">Category</div><div>{ticket.category?.name ?? "-"}</div></div><div className="col-md-4"><div className="small text-muted">Requested Priority</div><div>{priorityBadge(ticket.requestedPriority)}</div></div><div className="col-md-4"><div className="small text-muted">Created</div><div>{formatDate(ticket.createdAt)}</div></div>
      <div className="col-12"><div className="small text-muted">Description</div><div className="text-break">{ticket.description}</div></div>
    </div></div>
    <div className="card border-0 shadow-sm rounded-3 p-4 bg-white mb-4"><h2 className="h6 fw-bold mb-3">Ticket Operations</h2><div className="row g-3">
      <div className="col-md-4"><label htmlFor="ticket-owner" className="form-label small fw-semibold">Ticket Owner</label><select id="ticket-owner" className="form-select form-select-sm" value={ticket.ownerId ?? ""} disabled={saving === "owner"} onChange={(event) => { const ownerId = Number(event.target.value); if (ownerId) void save("owner", () => updateStaffTicketOwner(ticket.id, ownerId)); }}><option value="">Unassigned</option>{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}</select>{!ticket.ownerId && user && <button type="button" className="btn btn-sm btn-light border mt-2" onClick={() => void save("owner", () => updateStaffTicketOwner(ticket.id, user.id))}>Claim for myself</button>}</div>
      <div className="col-md-4"><label htmlFor="it-priority" className="form-label small fw-semibold">IT Priority</label><select id="it-priority" className="form-select form-select-sm" value={ticket.itPriority ?? ticket.requestedPriority} disabled={saving === "priority"} onChange={(event) => void save("priority", () => updateStaffTicketPriority(ticket.id, event.target.value))}>{["LOW", "MEDIUM", "HIGH"].map((value) => <option key={value}>{value}</option>)}</select></div>
      <div className="col-md-4"><label htmlFor="current-status" className="form-label small fw-semibold">Current Status</label><select id="current-status" className="form-select form-select-sm" value="" disabled={saving === "status" || nextStatuses.length === 0} onChange={(event) => void save("status", () => updateStaffTicketStatus(ticket.id, event.target.value))}><option value="">Choose next status</option>{nextStatuses.map((value) => <option key={value} value={value}>{formatStatus(value)}</option>)}</select><div className="small text-muted mt-1">Allowed next values only</div></div>
    </div></div>
    <div className="card border-0 shadow-sm rounded-3 bg-white mb-4"><div className="p-4 border-bottom"><h2 className="h6 fw-bold mb-0">Public Comments</h2></div><div className="p-4">{ticket.publicComments?.length ? ticket.publicComments.map((comment) => <div key={comment.id} className="border-bottom py-2"><div className="small fw-semibold">{comment.author.name} <span className="text-muted fw-normal">· {formatDate(comment.createdAt)}</span></div><div className="small text-break">{comment.content}</div></div>) : <div className="text-center py-3 text-muted">No comments yet.</div>}</div></div>
    <div className="card rounded-3 mb-4" style={{ backgroundColor: "#FEFBEA", border: "0", borderTop: "1px solid #FDE68A" }}><div className="p-4 border-bottom"><h2 className="h6 fw-bold mb-0">🔒 Internal Notes</h2></div><div className="p-4">{notes.length ? notes.map((note) => <div key={note.id} className="border-bottom py-2"><div className="small fw-semibold">{note.author.name} <span className="text-muted fw-normal">· {formatDate(note.createdAt)}</span></div><div className="small text-break">{note.content}</div></div>) : <div className="text-center py-3 text-muted">No internal notes yet.</div>}<form className="mt-3" onSubmit={handleNote}><label htmlFor="internal-note" className="form-label small fw-semibold">Add Internal Note</label><textarea id="internal-note" className="form-control form-control-sm" rows={3} value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} disabled={postingNote} />{noteError && <div className="text-danger small mt-1">{noteError}</div>}<button type="submit" className="btn btn-sm text-white mt-2" style={{ backgroundColor: "#006B3C" }} disabled={postingNote}>{postingNote ? "Saving..." : "Add Note"}</button></form></div></div>
  </div></div>;
};
