# TokTickIT REST API Specification (Sprint 2 MVP)

## 1. General Conventions & Headers

| Item | Value |
|---|---|
| **Base URL** | `/api` |
| **Authentication Simulation** | Uses the custom header `x-requester-id` to identify the active Development Requester context |
| **Content Type** | `application/json` (except file upload endpoints, which use `multipart/form-data`) |

---

## 2. Endpoints Specification

### 2.1 Get Active Development Requesters

Retrieves the list of active development requesters for the simulated user context. Inactive requesters must be excluded.

- **Endpoint:** `GET /api/requesters`
- **Headers:** None required

**Success Response `200 OK`**
```json
[
  {
    "id": 1,
    "name": "Jennifer Anderson",
    "email": "jennifer.anderson@example.com",
    "isActive": true
  },
  {
    "id": 2,
    "name": "Michael Brown",
    "email": "michael.brown@example.com",
    "isActive": true
  }
]
```

**Error Response**
- `500 Internal Server Error`  Database query failed

---

### 2.2 Get Active Categories

Retrieves all active ticket categories for dropdown population.

- **Endpoint:** `GET /api/categories`

**Success Response   `200 OK`**
```json
[
  { "id": 1, "name": "Account and Access", "isActive": true },
  { "id": 2, "name": "Hardware", "isActive": true },
  { "id": 3, "name": "Software", "isActive": true },
  { "id": 4, "name": "Network", "isActive": true }
]
```

---

### 2.3 Get Active Related Systems

Retrieves all active related systems for dropdown selection.

- **Endpoint:** `GET /api/related-systems`
- **Alias:** `GET /api/systems`

**Success Response   `200 OK`**
```json
[
  { "id": 1, "name": "Corporate Laptop", "isActive": true },
  { "id": 2, "name": "Campus Wi-Fi", "isActive": true },
  { "id": 3, "name": "VPN", "isActive": true },
  { "id": 4, "name": "Email", "isActive": true },
  { "id": 5, "name": "LEB2 App", "isActive": true },
  { "id": 6, "name": "Grade Submission App", "isActive": true },
  { "id": 7, "name": "Printer", "isActive": true }
]
```

---

### 2.4 Create Support Ticket

Creates a new support ticket associated with the requester. The backend automatically assigns a unique Ticket Number and sets the initial status to `NEW`.

- **Endpoint:** `POST /api/tickets`
- **Headers:** None required
- **Request Body:** Must include numeric `requesterId`

**Request Body**
```json
{
  "requesterId": 1,
  "categoryId": 2,
  "relatedSystemId": 1,
  "requestedPriority": "MEDIUM",
  "summary": "Laptop battery drains quickly",
  "description": "My laptop battery is draining much faster than usual even when idle."
}
```

**Success Response   `201 Created`**
```json
{
  "id": 101,
  "ticketNumber": "TKT-2026-000101",
  "requesterId": 1,
  "categoryId": 2,
  "relatedSystemId": 1,
  "requestedPriority": "MEDIUM",
  "itPriority": "MEDIUM",
  "currentStatus": "NEW",
  "summary": "Laptop battery drains quickly",
  "description": "My laptop battery is draining much faster than usual even when idle.",
  "createdAt": "2026-08-24T12:00:00.000Z",
  "updatedAt": "2026-08-24T12:00:00.000Z"
}
```

**Error Responses**
- `400 Bad Request` — Missing or invalid `requesterId`, or validation failure.
- `403 Forbidden` — The requester is inactive.
- `404 Not Found` — The requester does not exist.
- `409 Conflict` — Duplicate immediate ticket submission.

---

### 2.5 Get My Tickets (Paginated & Filtered)

Retrieves a paginated list of tickets owned strictly by the currently selected requester.

- **Endpoint:** `GET /api/tickets`
- **Query Parameter:** `requesterId` **(Required)**

**Query Parameters**

| Parameter | Required | Description |
|---|---|---|
| `requesterId` | required | Restricts results to the selected requester |
| `search` | optional | Matches substring in `ticketNumber` or `summary` |
| `categoryId` | optional | Filters by category ID |
| `requestedPriority` | optional | `LOW`, `MEDIUM`, `HIGH` |
| `itPriority` | optional | Filters by IT priority: `LOW`, `MEDIUM`, `HIGH` |
| `currentStatus` | optional | `NEW`, `IN_PROGRESS`, `RESOLVED`, etc. |
| `sortBy` | optional (default: `createdAt`) | `ticketNumber`, `createdAt`, `updatedAt` |
| `sortOrder` | optional (default: `desc`) | `asc` or `desc` |
| `page` | optional (default: `1`) | Page number (1-indexed) |
| `pageSize` | optional (default: `10`) | Items per page. The client UI defaults to `8` and allows `5`, `8`, `10`, or `20`. |

**Success Response   `200 OK`**
```json
{
  "data": [
    {
      "id": 101,
      "ticketNumber": "TKT-2026-000101",
      "summary": "Laptop battery drains quickly",
      "category": { "id": 2, "name": "Hardware" },
      "relatedSystem": { "id": 1, "name": "Corporate Laptop" },
      "requestedPriority": "MEDIUM",
      "itPriority": "MEDIUM",
      "currentStatus": "NEW",
      "createdAt": "2026-08-24T12:00:00.000Z",
      "updatedAt": "2026-08-24T12:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

---

### 2.6 Get Owned Ticket Details

Retrieves complete details of a single ticket. Enforces strict ownership checks.

- **Endpoint:** `GET /api/tickets/:id`
- **Query Parameter:** `requesterId` **(Required)**

**Success Response   `200 OK`**
```json
{
  "id": 101,
  "ticketNumber": "TKT-2026-000101",
  "requester": { "id": 1, "name": "Jennifer Anderson" },
  "category": { "id": 2, "name": "Hardware" },
  "relatedSystem": { "id": 1, "name": "Corporate Laptop" },
  "summary": "Laptop battery drains quickly",
  "description": "My laptop battery is draining much faster than usual even when idle.",
  "requestedPriority": "MEDIUM",
  "itPriority": "MEDIUM",
  "currentStatus": "NEW",
  "createdAt": "2026-08-24T12:00:00.000Z",
  "updatedAt": "2026-08-24T12:00:00.000Z",
  "attachments": [
    {
      "id": 1,
      "originalFileName": "battery_diagnostic.png",
      "fileName": "generated-storage-name.png",
      "fileSize": 204800,
      "mimeType": "image/png",
      "isRemoved": false,
      "removalReason": null,
      "createdAt": "2026-08-24T12:05:00.000Z"
    }
  ]
}
```

**Error Responses**
- `403 Forbidden` / `404 Not Found`   Ticket belongs to a different requester or does not exist

---

### 2.7 Upload Ticket Attachment

Uploads a permitted attachment to an owned ticket.

- **Endpoint:** `POST /api/tickets/:id/attachments`
- **Headers:**
  - `x-requester-id: <number>` **(Required)**
  - `Content-Type: multipart/form-data`

**Request Body (Form Data)**

| Field | Description |
|---|---|
| `file` | Binary file (Allowed: JPG, PNG, WEBP, PDF; Max 5 MB) |

**Success Response — `201 Created`**
```json
{
  "id": 2,
  "ticketId": 101,
  "originalFileName": "battery_diagnostic.png",
  "fileName": "generated-storage-name.png",
  "fileSize": 204800,
  "mimeType": "image/png",
  "isRemoved": false,
  "createdAt": "2026-08-24T12:10:00.000Z"
}
```

**Error Responses**
- `400 Bad Request`   File type not permitted, size > 5 MB, or active attachments limit (5 files) reached
- `403 Forbidden`   Requester does not own this ticket

---

### 2.8 Soft Remove Attachment

- **Endpoint:** `DELETE /api/attachments/:id`
- **Headers:** `x-requester-id: <number>` **(Required)**

**Success Response — `200 OK`**
```json
{
  "id": 1,
  "isRemoved": true,
  "removalReason": "Uploaded incorrect log file."
}
```

**Error Responses**
- `400 Bad Request`   Missing `removalReason`
- `403 Forbidden` / `404 Not Found`   Unauthorized requester or attachment not found

---

### 2.9 Download Attachment

Downloads an active attachment file stream. Soft-removed files cannot be downloaded.

- **Endpoint:** `GET /api/attachments/:id/download`
- **Headers:** `x-requester-id: <number>` **(Required)**

**Success Response   `200 OK`**
Binary file stream with appropriate `Content-Type` and `Content-Disposition`.

**Error Responses**
- `404 Not Found`   Attachment does not exist or has been soft-removed (`isRemoved = true`)
- `403 Forbidden`   Unauthorized requester

---

### 2.10 Get Attachment Metadata

- **Endpoint:** `GET /api/attachments/:id`
- **Headers:** `x-requester-id: <number>` **(Required)**

Returns metadata for an attachment owned by the requester. The response preserves
`originalFileName`, including Thai characters and spaces.

**Success Response — `200 OK`**
```json
{
  "id": 2,
  "ticketId": 101,
  "originalFileName": "battery_diagnostic.png",
  "fileName": "generated-storage-name.png",
  "fileSize": 204800,
  "mimeType": "image/png",
  "isRemoved": false,
  "removalReason": null,
  "createdAt": "2026-08-24T12:05:00.000Z"
}
```

---
