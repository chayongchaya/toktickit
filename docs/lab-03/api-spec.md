# Lab 3 API Specification

> Grounded in the actual Lab 2 implementation (`server/src/routes/tickets.ts`, `requesters.ts`,
> `server/prisma/schema.prisma`), not a re-imagined API. Every existing endpoint below is annotated
> with its real current path/shape and the specific edits Lab 3 requires. New endpoints follow the same
> response envelope and error-shape conventions already in the codebase. Endpoint list, roles, and
> status codes trace directly to `specification.md` §8 (as corrected) and are exercised by the tests in
> `tests.md`.

## 0. Corrections Carried Over From `specification.md` §8

Two things were wrong in the original API Contract Overview table and are now fixed there; this spec
assumes the corrected version:

1. Attachment creation is **`POST /api/tickets/:id/attachments`** (inside `ticketsRouter`), not a flat
   `POST /api/attachments`. The `/api/attachments/:id*` routes are read/delete only.
2. Every existing ownership check in `tickets.ts` currently returns **403** for a ticket/attachment that
   exists but belongs to another requester (`GET /api/tickets/:id`, `POST .../attachments`,
   `GET/DELETE /api/attachments/:id`, `GET /api/attachments/:id/download`). Lab 3's FR-07/AC-28
   existence-hiding policy requires **404** here instead. This is a code edit to existing handlers, not
   just new documentation — see §3 below for the exact diff shape.

A third, previously undocumented issue found while writing this spec: `POST /api/tickets` currently
hardcodes `itPriority: "MEDIUM"` on every new ticket, regardless of the submitted `requestedPriority`.
This contradicts BR-14 ("IT Priority initially copies Requested Priority at creation"). Lab 3 must fix
this line to `itPriority: requestedPriority` at creation time. This is a one-line, low-risk fix but is
called out explicitly here because it is easy to miss — nothing about it is visible from the outside
until a ticket is created with a non-Medium priority and IT Priority silently disagrees with it.

## 1. Conventions

### 1.1 Response envelopes (reused, not reinvented)
- **List endpoints** keep the exact shape already implemented in `GET /api/tickets`:
  ```json
  { "data": [ /* rows */ ], "pagination": { "total": 0, "page": 1, "pageSize": 10, "totalPages": 1 } }
  ```
  (The current code also duplicates the array as a `tickets` key for backward compatibility with an
  older client shape — Lab 3 keeps `data`/`pagination` as the documented contract and does not add a
  third duplicate key for new endpoints; existing duplication on `GET /api/tickets` itself is left as-is
  to avoid an unrelated breaking change.)
- **Single-resource endpoints** return the resource directly (no envelope), matching
  `GET /api/tickets/:id` and `POST /api/tickets` today.
- **Error shape** extends the existing `{ "error": "message" }` convention with an optional `field` for
  400s, per FR-07's "every validation error includes a field-level message":
  ```json
  { "error": "Email is required", "field": "email" }
  ```
  Non-validation errors (401/403/404/409/5xx) keep the flat `{ "error": "message" }` shape unchanged, so
  every existing Lab 2 error-shape assertion in `server/tests/lab-02/*` continues to pass unmodified.

### 1.2 Authentication
- Session cookie: `Set-Cookie: sid=<opaque>; HttpOnly; SameSite=Lax; Secure (production only); Max-Age=28800`
  (8-hour idle expiration, per `specification.md` §8).
- Every endpoint below except `POST /api/auth/login` requires this cookie. A missing/invalid/expired
  cookie returns `401 { "error": "Not authenticated" }` before any other check runs (FR-07 step 1).
- `getRequesterId(req)` (currently reading `x-requester-id` header / query / body, per
  `tickets.ts`) is removed from every Requester-facing handler and replaced with the session's
  `req.user.id`. No endpoint accepts a client-supplied requester/owner/author id for any purpose other
  than the staff-only `PATCH .../owner` reassignment target (BR-08).

### 1.3 Enums
```
Role:          REQUESTER | IT_STAFF | ADMINISTRATOR
Priority:      LOW | MEDIUM | HIGH                              (unchanged from Lab 2)
TicketStatus:  NEW | OPEN | IN_PROGRESS | WAITING_FOR_REQUESTER
               | RESOLVED | CLOSED | REOPENED | CANCELLED        (extends Lab 2's 4-value enum)
```

---

## 2. Authentication Endpoints (new)

### `POST /api/auth/login`
Public.
```json
// Request
{ "email": "jane@tiktockit.com", "password": "Str0ng!Pass" }
```
- **200**: sets session cookie, body `{ "id": 1, "name": "...", "role": "REQUESTER", "mustChangePassword": false }`.
- **401** `{ "error": "Invalid email or password." }` — identical for wrong password AND for a correct
  password on an inactive account (BR-01, FR-02, AC-05). The handler must not branch on which case
  occurred before choosing the response.
- **400** `{ "error": "Email and password are required", "field": "email" | "password" }` if either is
  missing from the body.

### `POST /api/auth/logout`
Authenticated.
- **204** no body; invalidates the session server-side (BR-06).
- **401** if called with no/expired session (nothing to log out of).

### `GET /api/auth/me`
Authenticated.
- **200** `{ "id": 1, "name": "...", "email": "...", "role": "...", "mustChangePassword": false }`.
- **401** if unauthenticated.
- This is also the endpoint the `AuthContext` (see `ui-spec.md` §2.1) calls on mount, replacing
  `RequesterContext`'s current `getRequesters()` bootstrap call.

### `POST /api/auth/change-password`
Authenticated (reachable even when `mustChangePassword = true` — this and logout are the only two
non-auth endpoints reachable in that state, per FR-05).
```json
{ "currentPassword": "Temp0rary!", "newPassword": "NewStr0ng!Pass" }
```
- **200** `{ "mustChangePassword": false }`.
- **400** `{ "error": "New password does not meet the password policy", "field": "newPassword" }` if BR-04
  fails (length/case/digit/special-char).
- **400** `{ "error": "New password must differ from the current password", "field": "newPassword" }` for
  BR-05 (this is 400, not 409, because it's a same-request input problem, not a conflicting state — kept
  consistent with FR-07's ordering: validation is the last check, and this rule is checked as part of
  validating the new-password field itself, not as a separate resource-state conflict).
- **401** if `currentPassword` doesn't match.

### `403` blocking behavior while `mustChangePassword = true` (FR-05)
A shared middleware, applied after session validation and before route handlers on every route except
`POST /api/auth/logout` and `POST /api/auth/change-password`, returns:
```json
403 { "error": "Password change required before continuing." }
```

---

## 3. Requester Endpoints (existing — session-derived identity, corrected status codes)

All five endpoints below are **edited in place** in `server/src/routes/tickets.ts`, not replaced.
Request/response bodies are otherwise unchanged from Lab 2.

| Endpoint | Change |
|---|---|
| `POST /api/tickets` | `getRequesterId(req)` → `req.user.id`. Fix `itPriority: "MEDIUM"` → `itPriority: requestedPriority` (§0). |
| `GET /api/tickets` | `getRequesterId(req)` → `req.user.id`. `whereClause.requesterId` uses the session id; the `requesterId` query/header path is deleted, not merely ignored. |
| `GET /api/tickets/:id` | `getRequesterId(req)` → `req.user.id`. Ownership-mismatch branch changes `res.status(403).json({ error: "Forbidden: You do not own this ticket" })` → `res.status(404).json({ error: "Ticket not found" })` — identical body to the not-found branch above it, so the two are indistinguishable (AC-28). |
| `POST /api/tickets/:id/attachments` | Same `req.user.id` substitution. Same 403→404 change on the ownership branch. |
| `GET /api/attachments/:id`, `GET /api/attachments/:id/download`, `DELETE /api/attachments/:id` | Same `req.user.id` substitution. Same 403→404 change on each ownership branch (three call sites). |

New addition to `GET /api/tickets/:id`'s response: `publicComments` (array, newest-last) and
`problemAppearsResolved` (boolean) fields, populated per §5 below. `internalNotes` is never included in
this response under any circumstance (FR-12, BR-22) — not returned as an empty array either, since the
field's mere presence/absence must not leak whether notes exist.

### `PATCH /api/tickets/:id/resolved-flag` (new)
Requester, owner only.
```json
{ "problemAppearsResolved": true }
```
- **200** returns the updated ticket (same shape as `GET /api/tickets/:id`). Does not touch
  `currentStatus` (FR-11).
- **404** if the ticket doesn't exist or isn't owned by the session (same existence-hiding rule as §3's
  table above).
- **400** if the body's `problemAppearsResolved` isn't a boolean.

---

## 4. Ticket Queue and Ticket Detail — IT Staff and Administrator (FR-19) (new)

All endpoints in this section: **401** if unauthenticated, **403** `{ "error": "Forbidden" }` if the
session role is `REQUESTER` (AC-25) — checked before any resource lookup, per FR-07's ordering.

### `GET /api/staff/tickets`
Same envelope and query-param pattern as the existing `GET /api/tickets` (§3), extended:

| Param | Values | Notes |
|---|---|---|
| `search` | string | Matches ticket number or summary, case-insensitive (unchanged pattern from `GET /api/tickets`) |
| `status` | one of the 8 `TicketStatus` values | |
| `category` | categoryId | |
| `requestedPriority`, `itPriority` | `LOW`\|`MEDIUM`\|`HIGH` | Two independent filters, not one |
| `owner` | userId, or literal `"unassigned"` | AC-22 |
| `sort` | `createdAt`\|`updatedAt`\|`itPriority` | Default `createdAt` desc. An unrecognized value falls back to the default rather than erroring (AC-23) — same `validSortFields.includes(...)` guard pattern already used in `GET /api/tickets` |
| `page`, `pageSize` | integers | Same clamping behavior as `GET /api/tickets` (`Math.max(1, ...)`) |

Combining filters uses AND semantics (AC-22). Response: `{ "data": [...], "pagination": {...} }`, each
row including `ownerId`, `ownerName` (denormalized for the table, avoiding an N+1 join on the client),
`itPriority`, `requestedPriority`, `currentStatus`.

### `GET /api/staff/tickets/:id`
No ownership restriction (FR-14 — the queue is shared). Returns the full ticket including
`publicComments` and `internalNotes` (the latter present here specifically because this route is
staff-only at both the router-mount layer and re-checked in the handler, per `specification.md` §8).
- Each attachment includes `isUnavailable: boolean`, which is `true` when an active attachment's
  stored file is missing from disk. Removed attachments always report `false`; the server never
  exposes the internal `storagePath` field.
- **404** only for a genuinely nonexistent id (no ownership-based 404 branch exists on this route, since
  there is no ownership restriction to hide).

### `PATCH /api/staff/tickets/:id/owner`
```json
{ "ownerId": 7 }
```
- **200** returns the updated ticket. Setting `ownerId` to the acting user's own id is "claim"; setting
  it to a different active IT Staff/Administrator id is "reassign" — same endpoint, no separate claim
  route, since the two only differ in what the request body's `ownerId` value is (BR-12).
- **409** `{ "error": "Ticket owner must be an active IT Staff or Administrator user" }` if the target
  user fails BR-11 (inactive, or a Requester) — a business-rule conflict on an otherwise-valid request
  shape, not a validation error, per FR-07's ordering (409 before 400 is inapplicable here since the
  *shape* is valid; only the *state* is wrong, so 409 is correct rather than 400).
- **400** if `ownerId` isn't a number or is missing.
- **404** if the ticket id doesn't exist.

### `PATCH /api/staff/tickets/:id/priority`
```json
{ "itPriority": "HIGH" }
```
- **200** returns the updated ticket. `requestedPriority` is never modified by this endpoint (BR-13).
- **400** if `itPriority` isn't one of the three valid values.
- **404** if the ticket id doesn't exist.

### `PATCH /api/staff/tickets/:id/status`
```json
{ "currentStatus": "IN_PROGRESS" }
```
- **200** returns the updated ticket.
- **400** `{ "error": "Invalid status value" }` if the value isn't one of the 8 valid statuses at all
  (BR-19, malformed-input branch).
- **409** `{ "error": "Transition from <current> to <requested> is not permitted" }` if the value is a
  valid status but not a permitted next value from BR-18's matrix — `currentStatus` is left unchanged
  (AC-08).
- **404** if the ticket id doesn't exist.

---

## 5. Public Comments and Internal Notes (new)

### `GET /api/tickets/:id/comments` and `POST /api/tickets/:id/comments`
Reachable by: the ticket's Requester (owner only — same 404-on-mismatch rule as §3), and any IT Staff /
Administrator (no ownership restriction, matching `GET /api/staff/tickets/:id`).
```json
// POST body
{ "content": "Thanks for the update." }
```
- **201** returns `{ "id": 1, "ticketId": 1, "authorId": 3, "authorName": "...", "authorRole": "REQUESTER", "content": "...", "createdAt": "..." }`.
  `authorId` is always `req.user.id`; any `authorId`/`createdAt` present in the request body is ignored,
  not merely overwritten silently in a way that could be mistaken for accepted input (BR-24, API-29).
- **400** `{ "error": "Content is required", "field": "content" }` for empty/whitespace, and
  `{ "error": "Content must be 2,000 characters or fewer", "field": "content" }` over the limit
  (BR-23, AC-16, AC-24).
- **404** for a Requester whose id doesn't match the ticket's requester (existence-hiding, same as §3).
- No `PATCH`/`DELETE` route exists for a comment id at all — append-only is enforced by the route table's
  absence, not by a convention comment (FR-22, API-29c).

### `GET /api/staff/tickets/:id/notes` and `POST /api/staff/tickets/:id/notes`
IT Staff / Administrator only — enforced at the router-mount layer (mounted under `/api/staff`) **and**
re-checked inside the handler (defense in depth, per `specification.md` §8's explicit call-out).
- **403** for a Requester session, with a body containing no note content or count whatsoever —
  `{ "error": "Forbidden" }` and nothing else (BR-22, AC-04, API-11). This is the one comments/notes
  endpoint that returns 403 rather than 404, because it is role-gated, not ownership-gated — there is no
  "wrong id vs. someone else's id" ambiguity to protect, only "this role may never call this route,"
  which is exactly FR-07 step 2, not step 3.
- Otherwise identical validation/shape/append-only rules to Public Comments (§5 above), on a fully
  separate `InternalNote` table (not a shared polymorphic comments table), so a query-scoping bug in one
  can never leak into the other (`specification.md` §7).

---

## 6. Administrator User Management (new)

All endpoints: **401** unauthenticated, **403** `{ "error": "Forbidden" }` for `REQUESTER` or `IT_STAFF`
sessions (AC-26).

### `GET /api/admin/users`
Query params: `search` (matches name or email, case-insensitive substring — same pattern as the ticket
search already implemented), `role` (optional, one of the 3 role values). **No `page`/`pageSize`
params** — per `specification.md` §12's recorded decision, this list is intentionally unpaginated
(mirrors `GET /api/requesters`'s existing flat-array shape rather than `GET /api/tickets`'s paginated
envelope).
- **200** `[ { "id": 1, "name": "...", "email": "...", "role": "...", "isActive": true }, ... ]` — a flat
  array, matching the existing `GET /api/requesters` convention exactly, not the `{ data, pagination }`
  envelope used by ticket lists.

### `POST /api/admin/users`
```json
{ "name": "Alex Thompson", "email": "alex@tiktockit.com", "role": "IT_STAFF", "isActive": true, "initialPassword": "Temp0rary!" }
```
- **201** returns the created user (no `passwordHash` field ever included in any response, ever).
  `mustChangePassword` is forced `true` regardless of what the client sends (FR-25).
- **409** `{ "error": "A user with this email already exists" }` — case-insensitive match (BR-25, AC-13).
- **400** for a missing required field, or a `role` outside the 3 permitted values (BR-26, AC-21), each
  with the specific `field` that failed.

### `PATCH /api/admin/users/:id`
```json
{ "name": "...", "email": "...", "role": "...", "isActive": false }
```
- **200** returns the updated user. Partial updates are allowed (only send the fields being changed).
- **409** for: duplicate email (BR-25), attempting to deactivate the acting Administrator's own account
  (BR-27, AC-11), or attempting to deactivate/reassign the sole remaining active Administrator's role
  (BR-28, AC-12) — three distinct causes, three distinct messages, matching `ui-spec.md` §2.6's
  three-banner UI requirement and `tests.md`'s UI-11 coverage.
- **400** for an invalid `role` value.
- **404** if the target user id doesn't exist.

### `POST /api/admin/users/:id/reset-password`
```json
{ "newInitialPassword": "NewTemp0rary!" }
```
- **200** `{ "mustChangePassword": true }`. The target user's existing session, if any, is **not**
  automatically revoked (BR-30 — out of scope for Lab 3); the next login is where the forced change
  takes effect.
- **404** if the user id doesn't exist.

**No `DELETE /api/admin/users/:id` route exists** — deactivation is the only lifecycle-ending operation
(BR-29); a request to a delete route returns the framework's normal 404 for an unmatched route, which
`API-38b` in `tests.md` treats as confirming evidence that no such route was accidentally left in.

---

## 7. Cross-Cutting Status Code Reference

| Code | Meaning | When |
|---|---|---|
| 200 / 201 / 204 | Success | Per endpoint above |
| 400 | Validation | Malformed/missing input, always with a `field` where applicable |
| 401 | Not authenticated | Missing/invalid/expired session |
| 403 | Authenticated, role never permitted | Wrong role for this route entirely (e.g. Requester → `/api/staff/*`), or the mandatory-password-change block |
| 404 | Not found / not yours | Nonexistent resource, **or** an existence-sensitive resource (ticket/attachment/comment) that exists but the session isn't permitted to see — deliberately indistinguishable |
| 409 | Conflict | Valid request shape, invalid current state (duplicate email, last-admin, invalid status transition, invalid ticket-owner target) |
| 5xx | Safe generic failure | Never includes a stack trace or raw driver error in the response body |

This table is the same ordered policy defined in `specification.md` FR-07, restated here as the
single reference `tests.md`'s `authorization.api.test.ts` (API-13) checks against across every endpoint
in this document.
