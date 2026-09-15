import React, { useEffect, useMemo, useState } from "react";
import { ApiError, AdminUser, AdminUserInput, createAdminUser, getAdminUsers, resetAdminUserPassword, updateAdminUser } from "../../api.js";
import { useAuth } from "../../context/AuthContext.js";

const roles: AdminUser["role"][] = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"];
const roleLabels: Record<string, string> = { REQUESTER: "Requester", IT_STAFF: "IT Staff", ADMINISTRATOR: "Administrator" };
const roleTokens: Record<string, React.CSSProperties> = {
  REQUESTER: { backgroundColor: "#F3F4F6", color: "#374151", border: "1px solid #E5E7EB" },
  IT_STAFF: { backgroundColor: "#EBF5FF", color: "#1E429F", border: "1px solid #C3DDFD" },
  ADMINISTRATOR: { backgroundColor: "#006B3C", color: "#FFFFFF", border: "none" },
};
const emptyForm: AdminUserInput & { initialPassword: string } = { name: "", email: "", role: "REQUESTER", isActive: true, initialPassword: "" };

function roleBadge(role: string) {
  return <span className="badge rounded-pill px-3 py-1 fw-normal" style={roleTokens[role] ?? roleTokens.REQUESTER}>{roleLabels[role] ?? role}</span>;
}

export const UserManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const requestId = React.useRef(0);

  const loadUsers = async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    try {
      const result = await getAdminUsers(search, role);
      if (currentRequest !== requestId.current) return;
      setUsers(result); setError(null);
    } catch (err) {
      if (currentRequest !== requestId.current) return;
      setError(err instanceof ApiError && err.status === 403 ? "You are not allowed to manage users." : "Unable to load users.");
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  };
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);
  useEffect(() => { void loadUsers(); }, [search, role]);

  const activeAdmins = useMemo(() => users.filter((entry) => entry.role === "ADMINISTRATOR" && entry.isActive).length, [users]);
  const isEditing = Boolean(editing);
  const clearForm = () => { setEditing(null); setForm(emptyForm); setShowReset(false); setResetPassword(""); setFieldErrors({}); };
  const startEdit = (entry: AdminUser) => { setEditing(entry); setForm({ name: entry.name, email: entry.email, role: entry.role, isActive: entry.isActive, initialPassword: "" }); setShowReset(false); setResetPassword(""); setFieldErrors({}); setSuccess(null); };
  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Name is required.";
    if (!form.email.trim()) next.email = "Email is required.";
    if (!isEditing && !form.initialPassword) next.initialPassword = "Initial password is required.";
    if (isEditing && showReset && !resetPassword) next.resetPassword = "New initial password is required.";
    setFieldErrors(next); return Object.keys(next).length === 0;
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!validate()) return;
    setSaving(true); setError(null); setSuccess(null);
    try {
      if (editing) {
        const updated = await updateAdminUser(editing.id, { name: form.name.trim(), email: form.email.trim(), role: form.role, isActive: form.isActive });
        if (showReset) await resetAdminUserPassword(editing.id, resetPassword);
        setUsers((current) => current.map((entry) => entry.id === updated.id ? { ...entry, ...updated, ...(showReset ? { mustChangePassword: true } : {}) } : entry));
        setSuccess("User saved successfully."); clearForm();
      } else {
        const created = await createAdminUser({ ...form, name: form.name.trim(), email: form.email.trim(), initialPassword: form.initialPassword });
        setUsers((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name))); setSuccess("User created successfully."); clearForm();
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) { setSuccess("User was no longer available. The list was refreshed."); clearForm(); await loadUsers(); }
      else if (err instanceof ApiError && err.status === 409) setFieldErrors(err.field ? { [err.field]: err.message } : { form: err.message });
      else setError(err instanceof ApiError ? err.message : "Unable to save user.");
    } finally { setSaving(false); }
  };
  const toggleActive = async () => {
    if (!editing) return;
    if (editing.id === currentUser?.id) {
      setError("You cannot deactivate your own account.");
      return;
    }
    if (editing.role === "ADMINISTRATOR" && editing.isActive && activeAdmins <= 1) {
      setError("The last active Administrator cannot be deactivated or reassigned.");
      return;
    }
    setSaving(true); setError(null); setSuccess(null);
    try { const updated = await updateAdminUser(editing.id, { isActive: !editing.isActive }); setUsers((current) => current.map((entry) => entry.id === updated.id ? updated : entry)); setEditing(updated); setForm((current) => ({ ...current, isActive: updated.isActive })); setSuccess(updated.isActive ? "User activated." : "User deactivated."); }
    catch (err) { setError(err instanceof ApiError ? err.message : "Unable to change user status."); }
    finally { setSaving(false); }
  };
  const passwordSection = !isEditing ? <>
    <label htmlFor="initial-password" className="form-label small fw-semibold mt-3">Initial Password</label>
    <input id="initial-password" type="password" className={`form-control form-control-sm ${fieldErrors.initialPassword ? "is-invalid" : ""}`} value={form.initialPassword} onChange={(event) => setForm({ ...form, initialPassword: event.target.value })} />
    {fieldErrors.initialPassword ? <div className="invalid-feedback d-block">{fieldErrors.initialPassword}</div> : <div className="form-text small">User will be required to change this password at first login.</div>}
  </> : <>
    {showReset ? <>
      <label htmlFor="reset-password" className="form-label small fw-semibold mt-3">New Initial Password</label>
      <input id="reset-password" type="password" className={`form-control form-control-sm ${fieldErrors.resetPassword ? "is-invalid" : ""}`} value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} />
      {fieldErrors.resetPassword && <div className="invalid-feedback d-block">{fieldErrors.resetPassword}</div>}
    </> : <button type="button" className="btn btn-sm btn-light border mt-3" onClick={() => setShowReset(true)}>Set New Initial Password</button>}
  </>;

  return <div style={{ backgroundColor: "#F5F7F6", minHeight: "100vh" }} className="pb-5"><div className="container py-4" style={{ maxWidth: 1280 }}>
    <div className="mb-4"><h1 className="h4 fw-bold mb-1">User Management</h1><p className="text-muted small mb-0">Create and manage TokTickIT user accounts.</p></div>
    {error && <div className="alert alert-danger" role="alert">{error}</div>}{success && <div className="alert alert-success" role="status">{success}</div>}{fieldErrors.form && <div className="alert alert-danger" role="alert">{fieldErrors.form}</div>}
    <div className="row g-4 align-items-start">
      <div className="col-lg-7"><div className="card border-0 shadow-sm rounded-3 bg-white"><div className="card-body p-3"><div className="row g-2"><div className="col-md-8"><label htmlFor="user-search" className="visually-hidden">Search users</label><div className="input-group input-group-sm"><span className="input-group-text">🔍</span><input id="user-search" className="form-control" placeholder="Search name or email..." value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /></div></div><div className="col-md-4"><label htmlFor="user-role-filter" className="visually-hidden">Role</label><select id="user-role-filter" className="form-select form-select-sm" value={role} onChange={(event) => setRole(event.target.value)}><option value="">All Roles</option>{roles.map((entry) => <option key={entry} value={entry}>{roleLabels[entry]}</option>)}</select></div></div></div></div>
        <div className="card border-0 shadow-sm rounded-3 bg-white mt-3 overflow-hidden"><div className="table-responsive"><table className="table align-middle mb-0"><thead style={{ backgroundColor: "#EAF6EF" }}><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Action</th></tr></thead><tbody>{loading ? <tr><td colSpan={5} className="text-center py-5 text-muted"><span className="placeholder-glow"><span className="placeholder col-8" /></span></td></tr> : users.length === 0 ? <tr><td colSpan={5} className="text-center py-5 text-muted">{search || role ? <>No users match your search. <button className="btn btn-link btn-sm" onClick={() => { setSearchInput(""); setSearch(""); setRole(""); }}>Clear</button></> : "No users yet."}</td></tr> : users.map((entry) => <tr key={entry.id}><td className="fw-semibold">{entry.name}</td><td className="small">{entry.email}</td><td>{roleBadge(entry.role)}</td><td><span className={entry.isActive ? "text-success" : "text-danger"}>{entry.isActive ? "Active" : "Inactive"}</span></td><td><button className="btn btn-sm btn-light border" onClick={() => startEdit(entry)}>Edit</button></td></tr>)}</tbody></table></div></div>
      </div>
      <div className="col-lg-5"><div className="card border-0 shadow-sm rounded-3 p-4 bg-white"><div className="d-flex justify-content-between align-items-center mb-3"><h2 className="h6 fw-bold mb-0">{isEditing ? "Edit User" : "Create User"}</h2>{isEditing && <button type="button" className="btn btn-sm btn-light border" onClick={clearForm}>New User</button>}</div><form onSubmit={save} noValidate>
        <label htmlFor="user-name" className="form-label small fw-semibold">Full Name</label><input id="user-name" className={`form-control form-control-sm mb-1 ${fieldErrors.name ? "is-invalid" : ""}`} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />{fieldErrors.name && <div className="invalid-feedback d-block mb-2">{fieldErrors.name}</div>}
        <label htmlFor="user-email" className="form-label small fw-semibold mt-2">Email</label><input id="user-email" type="email" className={`form-control form-control-sm mb-1 ${fieldErrors.email ? "is-invalid" : ""}`} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />{fieldErrors.email && <div className="invalid-feedback d-block mb-2">{fieldErrors.email}</div>}
        <label htmlFor="user-role" className="form-label small fw-semibold mt-2">Role</label><select id="user-role" className="form-select form-select-sm" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as AdminUser["role"] })}>{roles.map((entry) => <option key={entry} value={entry}>{roleLabels[entry]}</option>)}</select>
        <div className="form-check form-switch mt-3"><input id="user-active" className="form-check-input" type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /><label htmlFor="user-active" className="form-check-label small">Active account</label></div>
        {passwordSection}
        <div className="d-flex gap-2 mt-4"><button type="submit" className="btn btn-sm text-white" style={{ backgroundColor: "#006B3C" }} disabled={saving}>{saving ? "Saving..." : "Save User"}</button>{isEditing && <button type="button" className="btn btn-sm btn-light border" onClick={toggleActive} disabled={saving}>{form.isActive ? "Deactivate User" : "Activate User"}</button>}</div>
      </form></div></div>
    </div>
  </div></div>;
};
