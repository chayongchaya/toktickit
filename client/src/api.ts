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

export interface TicketsResponse {
  tickets: Ticket[];
  total: number;
  page: number;
  totalPages: number;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export async function checkSystem(): Promise<SystemStatus> {
  const healthRes = await fetch(`${API_URL}/api/health`);
  if (!healthRes.ok) throw new Error(`Health check failed: ${healthRes.status}`);

  const categoriesRes = await fetch(`${API_URL}/api/categories`);
  if (!categoriesRes.ok) throw new Error(`Categories failed: ${categoriesRes.status}`);

  const categories: Category[] = await categoriesRes.json();
  return { online: true, categories };
}

export async function getCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`);
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

export async function getSystems(): Promise<RelatedSystem[]> {
  const res = await fetch(`${API_URL}/api/systems`);
  if (!res.ok) throw new Error("Failed to fetch systems");
  return res.json();
}

export async function getRequesters(): Promise<RequesterUser[]> {
  const res = await fetch(`${API_URL}/api/requesters`);
  if (!res.ok) throw new Error("Failed to fetch requesters");
  return res.json();
}

export async function getTickets(
  requesterId: number,
  params: Record<string, any> = {}
): Promise<TicketsResponse> {
  const query = new URLSearchParams({ requesterId: requesterId.toString(), ...params });
  const res = await fetch(`${API_URL}/api/tickets?${query.toString()}`, {
    headers: { "x-requester-id": requesterId.toString() },
  });
  if (!res.ok) throw new Error("Failed to fetch tickets");
  return res.json();
}

export async function getTicketById(id: number | string, requesterId: number): Promise<Ticket> {
  const res = await fetch(`${API_URL}/api/tickets/${id}?requesterId=${requesterId}`, {
    headers: { "x-requester-id": requesterId.toString() },
  });
  if (!res.ok) throw new Error("Failed to fetch ticket detail");
  return res.json();
}

export async function createTicket(ticketData: any, requesterId: number): Promise<Ticket> {
  const res = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-requester-id": requesterId.toString(),
    },
    body: JSON.stringify({ ...ticketData, requesterId }),
  });
  if (!res.ok) throw new Error("Failed to create ticket");
  return res.json();
}

export async function deleteAttachment(
  ticketId: number,
  attachmentId: number,
  removalReason: string,
  requesterId: number
): Promise<Attachment> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments/${attachmentId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "x-requester-id": requesterId.toString(),
    },
    body: JSON.stringify({ removalReason }),
  });
  if (!res.ok) throw new Error("Failed to remove attachment");
  return res.json();
}