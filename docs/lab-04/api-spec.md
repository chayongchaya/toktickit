# Lab 4 API Specification

> Grounded in the actual implementation added this sprint (`server/src/routes/staff.ts`,
> `server/src/routes/tickets.ts`, `server/prisma/schema.prisma`). Every endpoint below reuses the
> response-envelope and error-shape conventions already established in Lab 3's `api-spec.md`. Endpoint
> list, roles, and status codes trace directly to `specification.md` §8 and are exercised by the tests
> in `tests.md`.

## 1. Conventions (unchanged from Lab 3)
- Single-resource endpoints return the resource directly (no envelope).
- Error shape: `{ "error": "message" }`, with an optional `field` for 400s (validation errors), e.g.
  `{ "error": "Follow-up Note is required when follow-up is needed", "field": "followUpNote" }`.
- Session cookie authentication; a missing/invalid/expired session returns `401 { "error": "Not authenticated" }` before any other check runs.
- Authorization ordering per endpoint below is always: 401 (not authenticated) → 403 (wrong role) → 404 (resource does not exist / does not belong to the caller) → 409 (conflict, where applicable) → 400 (validation).

## 2. Actions Taken

### 2.1 `POST /api/staff/tickets/:id/actions`
Create an Actions Taken row on Ticket `:id`. **Role: IT Staff, Administrator.**

Request body:
```json
{
  "description": "Reissued the VPN client certificate.",
  "result": "Requester authenticated successfully after reissue.",
  "followUpRequired": false,
  "followUpNote": null,
  "attachmentNotes": "See vpn-log-excerpt.txt attached to the internal note."
}
```
- `description` (string, required, 1–2000 chars after trim)
- `result` (string, required, 1–2000 chars after trim)
- `followUpRequired` (boolean, required)
- `followUpNote` (string, required only if `followUpRequired` is `true`; ignored/stored as `null` if `followUpRequired` is `false`; max 2000 chars)
- `attachmentNotes` (string, optional, max 2000 chars)

`actionDateTime` and `performedBy` are never read from the request body; they are set by the server from `now()` and the authenticated session, respectively.

Response `201`:
```json
{
  "id": 42,
  "actionDateTime": "2026-09-24T10:15:00.000Z",
  "description": "Reissued the VPN client certificate.",
  "result": "Requester authenticated successfully after reissue.",
  "followUpRequired": false,
  "followUpNote": null,
  "attachmentNotes": "See vpn-log-excerpt.txt attached to the internal note.",
  "createdAt": "2026-09-24T10:15:00.000Z",
  "updatedAt": "2026-09-24T10:15:00.000Z",
  "performedBy": { "id": 7, "name": "Kevin Patel", "role": "IT_STAFF" }
}
```

Errors: `401` not authenticated · `403` caller is a Requester · `404` Ticket `:id` does not exist · `400` validation (missing/too-long description or result, or missing follow-up note when required) with `field`.

### 2.2 `PATCH /api/staff/tickets/:id/actions/:actionId`
Update an existing Actions Taken row. **Role: IT Staff, Administrator** — any active staff/admin user, not only the original author (BR-03).

Request body: same shape as §2.1 (all four editable fields are required in the body; this is a full replace of the editable fields, not a partial patch, matching the single-form create/edit UI in `ui-spec.md`).

Response `200`: same shape as §2.1's response, with `performedBy` and `actionDateTime` unchanged from creation and `updatedAt` refreshed.

Errors: `401` · `403` Requester · `404` the Ticket does not exist, or `actionId` does not exist, or `actionId` exists but does not belong to Ticket `:id` · `400` validation, same rules as §2.1.

### 2.3 Actions Taken on existing ticket-detail responses
- `GET /api/tickets/:id` (Requester, existing route): response now includes `actionsTaken` — an array, oldest first, of `{ id, actionDateTime, description, result, followUpRequired, followUpNote, attachmentNotes, createdAt, updatedAt, performedBy: { id, name, role } }`. Read-only; no write route exists for this role. Empty array (`[]`) for a Ticket with no Actions Taken, never an error.
- `GET /api/staff/tickets/:id` (IT Staff/Administrator, existing route): response now includes `actionsTaken` in the same shape.

## 3. Dashboards

Dashboard endpoints return concise, pre-aggregated data — never a full Ticket collection — per the handout's Dashboard Contract (§6.2).

### 3.1 `GET /api/tickets/dashboard`
Requester Dashboard. **Role: Requester only.** IT Staff and Administrator callers receive `403` and must use `/api/staff/dashboard`. Registered ahead of `GET /api/tickets/:id` in `tickets.ts` so the literal path `dashboard` is never captured by the `:id` parameter.

Response `200`:
```json
{
  "cards": { "myOpenTickets": 3, "waitingForRequester": 2, "resolved": 5, "closed": 12 },
  "recentTickets": [
    { "id": 1, "ticketNumber": "TKT-2026-000001", "summary": "Laptop battery drains quickly", "currentStatus": "IN_PROGRESS", "updatedAt": "2026-09-24T09:14:00.000Z" }
  ]
}
```
Calculations (all scoped to `requesterId = req.user.id`):
- `myOpenTickets` = count where `currentStatus` in `{NEW, OPEN, IN_PROGRESS, REOPENED}`.
- `waitingForRequester` = count where `currentStatus = WAITING_FOR_REQUESTER`.
- `resolved` = count where `currentStatus = RESOLVED`.
- `closed` = count where `currentStatus = CLOSED`.
- `recentTickets` = up to 5 of the caller's own Tickets, ordered by `updatedAt` descending.

Empty state: a Requester with no Tickets receives `{"cards": {"myOpenTickets": 0, "waitingForRequester": 0, "resolved": 0, "closed": 0}, "recentTickets": []}` with `200`, never an error.

Errors: `401` not authenticated · `403` caller is IT Staff or Administrator.

### 3.2 `GET /api/staff/dashboard`
IT Staff/Administrator Dashboard. **Role: IT Staff, Administrator.**

Response `200`:
```json
{
  "cards": { "new": 14, "open": 23, "inProgress": 18, "waitingForRequester": 7, "myAssigned": 16, "unassigned": 5 },
  "recentTickets": [
    { "id": 1, "ticketNumber": "TKT-2026-000001", "summary": "Laptop battery drains quickly", "currentStatus": "IN_PROGRESS", "updatedAt": "2026-09-24T09:14:00.000Z" }
  ]
}
```
Calculations:
- `new`/`open`/`inProgress`/`waitingForRequester` = queue-wide counts by `currentStatus` (not scoped to the caller).
- `myAssigned` = count where `ownerId = req.user.id` and `currentStatus` not in `{CLOSED, CANCELLED}`.
- `unassigned` = count where `ownerId IS NULL` and `currentStatus` not in `{CLOSED, CANCELLED, RESOLVED}` (BR-15).
- `recentTickets` = up to 5 Tickets owned by the caller, ordered by `updatedAt` descending.

Empty state: a brand-new staff account with no owned Tickets receives `myAssigned: 0` and `recentTickets: []`, `200`, never an error.

Errors: `401` not authenticated · `403` caller is a Requester.

## 4. Dashboard Drill-Down Contract
The dashboard API returns concise data only. Drill-down destinations are defined by `ui-spec.md`: Requester metric cards navigate to `/tickets` with the corresponding status filter; Staff/Administrator cards navigate to `/queue` with the corresponding status/ownership filter. Recent-ticket rows navigate to the relevant Ticket Detail page. No dashboard endpoint returns a full Ticket collection.

## 5. Validation and Safe Failure Contract
- Validation failures return `400` with `{ error, field }` where a specific field can be identified.
- Not-found and ownership failures return `404` without revealing whether a protected resource exists to an unauthorized Requester.
- Status-transition conflicts return `409` with the current safe error message and leave the stored status unchanged.
- Unexpected server failures return a generic `500` error response; stack traces, SQL, filesystem paths, session data, and other internal implementation details are not returned to clients.
- Successful create/update controls are expected to be protected against duplicate in-flight submissions by the client; the API remains safe under ordinary retries by validating the resulting state rather than trusting client timestamps or actor ids.

## 6. Time Zone and Date Boundaries
All timestamps (`actionDateTime`, `createdAt`, `updatedAt`, `updatedAt` on dashboard ticket summaries) are stored and returned in UTC ISO-8601; the client formats them in the browser's local time zone for display (`toLocaleString`). No dashboard calculation depends on a specific calendar-day boundary (all counts are status-based, not date-range-based), so no server-side time-zone conversion is required for correctness this sprint.

## 7. Concurrency / Conflict Behavior
- Actions Taken edits use last-write-wins (no version token in Lab 4). The handout does not require optimistic locking for Actions Taken, so the test suite verifies that a later valid update replaces only the editable fields without changing `performedBy`, `actionDateTime`, or the parent Ticket.
- Ticket status changes retain Lab 3's conflict rule: an attempted transition that is not permitted from the Ticket's current status returns `409` and leaves `currentStatus` unchanged (BR-11), which safely handles stale workflow updates. Tests must simulate two sequential callers using an intentionally stale expected state.
