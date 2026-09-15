const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// Lab 3: every authenticated call must send the session cookie. Public,
// pre-login calls (like /api/health or the auth calls below) also set this
// harmlessly — the browser simply has no cookie to send yet on first login.
const CREDENTIALS: RequestCredentials = "include";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  mustChangePassword: boolean;
}


export interface Category {
  id: number;
  name: string;
  isActive?: boolean;
}

export interface RelatedSystem {
  id: number;
  name: string;
  isActive?: boolean;
}

export interface RequesterUser {
  id: number;
  name: string;
  email: string;
  isActive?: boolean;
}

export interface Attachment {
  id: number;
  fileName: string; // internal storage filename — never show this in the UI
  originalFileName: string; // requester's original upload name — use this for display
  fileSize: number;
  mimeType?: string;
  isRemoved: boolean;
  removalReason?: string | null;
  createdAt?: string;
}

// PublicComment as returned by GET/POST /api/tickets/:id/comments.
export interface PublicComment {
  id: number;
  content: string;
  createdAt: string;
  author: { id: number; name: string; role: string };
}

export interface Ticket {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  requestedPriority: string;
  itPriority?: string;
  currentStatus: string;
  createdAt: string;
  updatedAt: string;
  problemAppearsResolved?: boolean;
  requesterId?: number;
  requester?: RequesterUser;
  categoryId?: number;
  category?: Category;
  relatedSystemId?: number;
  relatedSystem?: RelatedSystem;
  attachments?: Attachment[];
  publicComments?: PublicComment[];
}

export interface Pagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TicketsResponse {
  data: Ticket[];
  pagination: Pagination;
}

export interface StaffTicketListParams {
  search?: string;
  status?: string;
  category?: number | string;
  requestedPriority?: string;
  itPriority?: string;
  owner?: number | string;
  sort?: "createdAt" | "updatedAt" | "itPriority";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function getStaffOwners(): Promise<RequesterUser[]> {
  const res = await fetch(`${API_URL}/api/staff/owners`, { credentials: CREDENTIALS });
  return handleResponse<RequesterUser[]>(res, "Failed to load ticket owners.");
}

export async function getStaffTickets(params: StaffTicketListParams = {}): Promise<TicketsResponse> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const res = await fetch(`${API_URL}/api/staff/tickets?${query.toString()}`, { credentials: CREDENTIALS });
  return handleResponse<TicketsResponse>(res, "Failed to load staff ticket queue.");
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export interface CreateTicketInput {
  summary: string;
  description: string;
  categoryId: number;
  relatedSystemId: number;
  requestedPriority: string;
}

export interface TicketListParams {
  search?: string;
  categoryId?: number | string;
  requestedPriority?: string;
  currentStatus?: string;
  sortBy?: "ticketNumber" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export class ApiError extends Error {
  field?: string;
  status: number;
  constructor(message: string, status: number, field?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.field = field;
  }
}

async function handleResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (body && typeof body === "object" && "error" in body && body.error) ||
      fallbackMessage;
    const field = body && typeof body === "object" && "field" in body ? body.field : undefined;
    throw new ApiError(message, res.status, field);
  }
  return body as T;
}

export async function checkSystem(): Promise<SystemStatus> {
  const healthRes = await fetch(`${API_URL}/api/health`);
  if (!healthRes.ok) throw new Error(`Health check failed: ${healthRes.status}`);

  const categories = await getCategories();
  return { online: true, categories };
}

export async function getCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`);
  return handleResponse<Category[]>(res, "Failed to fetch categories.");
}

export async function getSystems(): Promise<RelatedSystem[]> {
  const res = await fetch(`${API_URL}/api/systems`);
  return handleResponse<RelatedSystem[]>(res, "Failed to fetch related systems.");
}

export async function getTickets(params: TicketListParams = {}): Promise<TicketsResponse> {
  const queryParams: Record<string, string> = {};
  if (params.search) queryParams.search = params.search;
  if (params.categoryId != null) queryParams.categoryId = String(params.categoryId);
  if (params.requestedPriority) queryParams.requestedPriority = params.requestedPriority;
  if (params.currentStatus) queryParams.currentStatus = params.currentStatus;
  if (params.sortBy) queryParams.sortBy = params.sortBy;
  if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
  if (params.page != null) queryParams.page = String(params.page);
  if (params.pageSize != null) queryParams.pageSize = String(params.pageSize);

  const query = new URLSearchParams(queryParams);
  // Lab 3: no requesterId param and no x-requester-id header — the session
  // cookie (credentials: "include") is the only identity the server trusts
  // (BR-03). The server derives "my tickets" from req.user.id.
  const res = await fetch(`${API_URL}/api/tickets?${query.toString()}`, {
    credentials: CREDENTIALS,
  });
  return handleResponse<TicketsResponse>(res, "Failed to fetch tickets.");
}

export async function getTicketById(id: number | string): Promise<Ticket> {
  const res = await fetch(`${API_URL}/api/tickets/${id}`, { credentials: CREDENTIALS });
  return handleResponse<Ticket>(res, "Failed to fetch ticket detail.");
}

export async function createTicket(ticketData: CreateTicketInput): Promise<Ticket> {
  const res = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    credentials: CREDENTIALS,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ticketData),
  });
  return handleResponse<Ticket>(res, "Failed to create ticket.");
}

export async function uploadAttachment(ticketId: number | string, file: File): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    method: "POST",
    credentials: CREDENTIALS,
    body: formData,
  });
  return handleResponse<Attachment>(res, `Failed to upload "${file.name}".`);
}

export async function deleteAttachment(attachmentId: number, removalReason: string): Promise<Attachment> {
  const res = await fetch(`${API_URL}/api/attachments/${attachmentId}`, {
    method: "DELETE",
    credentials: CREDENTIALS,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ removalReason }),
  });
  return handleResponse<Attachment>(res, "Failed to remove attachment.");
}

// --- Lab 3: Public Comments and the Requester's "problem appears resolved" flag ---

export async function getPublicComments(ticketId: number | string): Promise<PublicComment[]> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/comments`, { credentials: CREDENTIALS });
  return handleResponse<PublicComment[]>(res, "Failed to load comments.");
}

export async function postPublicComment(
  ticketId: number | string,
  content: string
): Promise<PublicComment> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/comments`, {
    method: "POST",
    credentials: CREDENTIALS,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  return handleResponse<PublicComment>(res, "Failed to post comment.");
}

export async function setProblemAppearsResolved(
  ticketId: number | string,
  problemAppearsResolved: boolean
): Promise<Ticket> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/resolved-flag`, {
    method: "PATCH",
    credentials: CREDENTIALS,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ problemAppearsResolved }),
  });
  return handleResponse<Ticket>(res, "Failed to update ticket.");
}

// --- Lab 3: Authentication -------------------------------------------------

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    credentials: CREDENTIALS,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<AuthUser>(res, "Login failed.");
}

export async function logout(): Promise<void> {
  const res = await fetch(`${API_URL}/api/auth/logout`, {
    method: "POST",
    credentials: CREDENTIALS,
  });
  if (!res.ok && res.status !== 401) {
    // A 401 here just means "already logged out" from the server's point of
    // view — nothing to surface to the user as an error.
    await handleResponse<void>(res, "Logout failed.");
  }
}

// Returns null (rather than throwing) for a 401, since "not logged in" is
// the normal, expected first-load state for this call, not an error.
export async function getCurrentUser(): Promise<AuthUser | null> {
  const res = await fetch(`${API_URL}/api/auth/me`, { credentials: CREDENTIALS });
  if (res.status === 401) return null;
  return handleResponse<AuthUser>(res, "Failed to load current user.");
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ mustChangePassword: boolean }> {
  const res = await fetch(`${API_URL}/api/auth/change-password`, {
    method: "POST",
    credentials: CREDENTIALS,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return handleResponse<{ mustChangePassword: boolean }>(res, "Failed to change password.");
}
