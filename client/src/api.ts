const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

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
  fileName: string;
  fileSize: number;
  mimeType?: string;
  isRemoved: boolean;
  removalReason?: string | null;
  createdAt?: string;
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
  requesterId?: number;
  requester?: RequesterUser;
  categoryId?: number;
  category?: Category;
  relatedSystemId?: number;
  relatedSystem?: RelatedSystem;
  attachments?: Attachment[];
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

async function handleResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (body && typeof body === "object" && "error" in body && body.error) ||
      fallbackMessage;
    throw new Error(message);
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

export async function getRequesters(): Promise<RequesterUser[]> {
  const res = await fetch(`${API_URL}/api/requesters`);
  return handleResponse<RequesterUser[]>(res, "Failed to fetch requesters.");
}

export async function getTickets(
  requesterId: number,
  params: TicketListParams = {}
): Promise<TicketsResponse> {
  const queryParams: Record<string, string> = {
    requesterId: requesterId.toString(),
  };
  if (params.search) queryParams.search = params.search;
  if (params.categoryId != null) queryParams.categoryId = String(params.categoryId);
  if (params.requestedPriority) queryParams.requestedPriority = params.requestedPriority;
  if (params.currentStatus) queryParams.currentStatus = params.currentStatus;
  if (params.sortBy) queryParams.sortBy = params.sortBy;
  if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
  if (params.page != null) queryParams.page = String(params.page);
  if (params.pageSize != null) queryParams.pageSize = String(params.page);

  const query = new URLSearchParams(queryParams);
  const res = await fetch(`${API_URL}/api/tickets?${query.toString()}`, {
    headers: { "x-requester-id": requesterId.toString() },
  });
  return handleResponse<TicketsResponse>(res, "Failed to fetch tickets.");
}

export async function getTicketById(id: number | string, requesterId: number): Promise<Ticket> {
  const res = await fetch(`${API_URL}/api/tickets/${id}`, {
    headers: { "x-requester-id": requesterId.toString() },
  });
  return handleResponse<Ticket>(res, "Failed to fetch ticket detail.");
}

export async function createTicket(
  ticketData: CreateTicketInput,
  requesterId: number
): Promise<Ticket> {
  const res = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-requester-id": requesterId.toString(),
    },
    body: JSON.stringify({ ...ticketData, requesterId }),
  });
  return handleResponse<Ticket>(res, "Failed to create ticket.");
}

export async function uploadAttachment(
  ticketId: number | string,
  file: File,
  requesterId: number
): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);

  // Keep the existing FormData contract expected by the component test,
  // while also sending the requester identity in the standard header.
  formData.append("requesterId", String(requesterId));

  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    method: "POST",
    headers: { "x-requester-id": requesterId.toString() },
    body: formData,
  });
  return handleResponse<Attachment>(res, `Failed to upload "${file.name}".`);
}

export async function deleteAttachment(
  attachmentId: number,
  removalReason: string,
  requesterId: number
): Promise<Attachment> {
  const res = await fetch(`${API_URL}/api/attachments/${attachmentId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "x-requester-id": requesterId.toString(),
    },
    body: JSON.stringify({ removalReason }),
  });
  return handleResponse<Attachment>(res, "Failed to remove attachment.");
}
