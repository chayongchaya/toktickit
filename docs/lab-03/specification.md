# Lab 3 Sprint Engineering Specification

## 1. Sprint Goal
Replace the temporary Development Requester selector with real authentication and server-side, role-based authorization, and deliver the first operational IT Staff Ticket workflow (queue, ownership, IT Priority, Public Comments, Internal Notes, status transitions) plus a minimalist Administrator User Management screen — all without breaking the completed Lab 2 Requester increment.

## 2. Stakeholder Request Interpretation
The system needs real users instead of a dev-only selector. Administrators need a simple screen to create, edit, activate/deactivate accounts, assign one role, and issue initial passwords. Anyone logging in with an initial password must set a new one before using the app. Requesters keep all Lab 2 ticket behavior, now driven by their authenticated identity, and can additionally post Public Comments and flag a ticket as "problem appears resolved." IT Staff get a shared queue to find, claim/reassign, prioritize, and progress tickets through status, communicating with Requesters via Public Comments and recording private Internal Notes. Every protected action is enforced on the backend — hidden UI is not security.

## 3. Scope

### Included
- Email/password authentication, mandatory first-login password change, logout, current-user retrieval.
- Server-side role-based authorization for Requester, IT Staff, Administrator (three mutually exclusive roles).
- Migration of Lab 2 `RequesterUser` records into a unified `User` model with role `REQUESTER`.
- Continued Requester ownership protection on all Lab 2 Ticket/Attachment endpoints, now keyed off the authenticated session instead of a client-supplied `requesterId`.
- IT Staff Ticket Queue (search, filter, sort, pagination) and extended Ticket Detail (claim/reassign ownership, set IT Priority, permitted status transitions, Public Comments, Internal Notes).
- Requester ability to post Public Comments and mark "problem appears resolved" (does not change `currentStatus`).
- Minimalist Administrator User Management: list/search/filter users, create user, edit basic info, assign one role, activate/deactivate, set new initial password.

### Excluded (per handout §4.2)
- Email invitations, password-reset email, MFA, social login, SSO.
- Self-registration.
- Actions Taken (deferred to Lab 4; resolution is not blocked by incomplete Actions Taken in Lab 3).
- SLA calculation, escalation, notification services.
- Dashboards/KPI analytics beyond simple queue counts.
- Multi-tenant orgs/departments.
- User deletion, bulk operations, import/export, account-history screens.
- Multiple roles per user.
- Mandatory pagination/multi-column sort/multi-filter on the admin user list (kept simple by design, not by limitation).

## 4. Functional Requirements

**Authentication**
- FR-01: The system must authenticate a user by email and password and reject invalid credentials with a generic error that does not reveal whether the email exists.
- FR-02: The system must reject login for an account with `isActive = false` using the same generic error as invalid credentials.
- FR-03: The system must issue an authenticated session (httpOnly cookie) on successful login and invalidate it on logout.
- FR-04: The system must expose `GET /api/auth/me` returning the current authenticated user's id, name, email, role, and `mustChangePassword` flag, or 401 if unauthenticated.
- FR-05: If `mustChangePassword` is true, the system must block access to all non-auth endpoints (except logout and the change-password endpoint itself) until a new password is saved.
- FR-06: The system must allow a user to change their own password by supplying the current password and a new password meeting the password policy (§5).

**Authorization**
- FR-07: Every protected endpoint must apply checks in this fixed order and stop at the first failure: (1) authentication → 401 if missing/invalid; (2) role → 403 if the authenticated user's role is never permitted to call this endpoint at all (e.g. a Requester calling any `/api/staff/*` or `/api/admin/*` route); (3) ownership on an existence-sensitive resource (a specific ticket/attachment/comment id) → 404, not 403, so a wrong id and someone else's id are indistinguishable; (4) business-rule conflict (state doesn't allow the action, e.g. last active Administrator, duplicate email, invalid status transition) → 409; (5) input validation → 400. This exact ordering and the 401/403/404/409/400 policy is used consistently across every endpoint in `api-spec.md`, every AC below, and every authorization test in `tests.md` — no endpoint may invent its own status-code convention.
- FR-08: The frontend must render only the navigation and actions permitted for the current user's role; this is a UX convenience only and must not be relied on for security.

**Requester (regression + new)**
- FR-09: All Lab 2 Requester Ticket and Attachment functions must continue to work, driven by `req.user.id` instead of a client-supplied `requesterId` or the removed dev selector.
- FR-10: A Requester must be able to add a Public Comment to their own ticket.
- FR-11: A Requester must be able to mark a ticket "problem appears resolved" without changing `currentStatus`; this must be visible to IT Staff.
- FR-12: A Requester must not be able to view or create Internal Notes, and must not be able to set `currentStatus` to `RESOLVED` or `CLOSED`.

**IT Staff**
- FR-13: IT Staff must be able to retrieve a Ticket Queue with search (ticket number, summary), filters (status, category, priority, owner), sort (created date, updated date, priority), and pagination.
- FR-14: IT Staff must be able to retrieve full Ticket Detail for any ticket (no ownership restriction — queue is shared).
- FR-15: IT Staff must be able to claim an unassigned ticket (sets `ownerId` to self) or reassign an already-owned ticket to another active IT Staff/Administrator.
- FR-16: IT Staff must be able to set IT Priority independently of Requested Priority.
- FR-17: IT Staff must be able to transition `currentStatus` along the permitted transition matrix (§5, ticket workflow rules).
- FR-18: IT Staff must be able to post Public Comments and Internal Notes on any ticket.
- FR-19: Administrators have the same Ticket read/operate permissions as IT Staff for the purposes of FR-13–FR-18 (per handout §4.3, conceptually separate responsibilities but not blocked from viewing/operating tickets where the matrix allows). This is a permissions grant only, not a UI requirement: an Administrator exercises it through the same `/queue` and `/queue/:id` screens IT Staff use (see `ui-spec.md` §2.4–§2.5); the Administrator's own dedicated screen remains limited to User Management (§8.5 of the handout), and Lab 3 does not add a separate Ticket-management surface inside the Administrator UI.

**Comments and Notes**
- FR-20: Public Comments must be visible to the ticket's Requester, any IT Staff, and any Administrator.
- FR-21: Internal Notes must be visible only to IT Staff and Administrator, and must never be returned in any response reachable by the ticket's Requester.
- FR-22: Comments and Notes are append-only in Lab 3 (no edit/delete endpoints).
- FR-23: Empty or whitespace-only comment/note content must be rejected with a 400 validation error.

**Administrator**
- FR-24: An Administrator must be able to list users with search by name/email and an optional single role filter.
- FR-25: An Administrator must be able to create a user with name, email, one role, active state, and an initial password (`mustChangePassword` set to true).
- FR-26: An Administrator must be able to edit a user's name, email, role, and active state.
- FR-27: An Administrator must be able to set a new initial password for any user, forcing `mustChangePassword = true` on next login.
- FR-28: The system must reject creating/updating a user with an email that duplicates another user's email (case-insensitive).
- FR-29: The system must prevent an Administrator from deactivating their own account.
- FR-30: The system must prevent deactivating or changing the role of the last remaining active Administrator.

## 5. Business Rules

**Authentication and passwords**
- BR-01: Only an active user with valid credentials may authenticate.
- BR-02: A user marked `mustChangePassword = true` cannot reach any application screen other than the change-password screen until a new valid password is saved.
- BR-03: Passwords are never stored in plaintext; the system stores only a bcrypt hash.
- BR-04: A new password must be at least 8 characters and include upper case, lower case, a number, and a special character (matches the UI checklist in §8.1 of the handout).
- BR-05: The new password on a mandatory change must differ from the current (temporary) password.
- BR-06: Logging out invalidates the current session server-side; a request with the old session id after logout must receive 401.
- BR-07: There is no login-attempt lockout in Lab 3 (explicitly out of scope); repeated failed attempts return the same generic error each time.

**Identity and ownership**
- BR-08: The authenticated user identity, not a `requesterId`/`ownerId` supplied by the client, determines ownership for all Requester operations.
- BR-09: A Requester may only view or modify tickets and attachments they own.
- BR-10: A Ticket has at most one Requester (owner of the request) and at most one Ticket Owner (assigned IT Staff/Admin), which may be null (unassigned).

**IT Staff assignment and priority**
- BR-11: A Ticket Owner must be an active user with role `IT_STAFF` or `ADMINISTRATOR`.
- BR-12: Claiming an unassigned ticket sets `ownerId` to the acting IT Staff/Admin user; reassigning an owned ticket may be done by any IT Staff/Admin, not only the current owner.
- BR-13: Requested Priority is set once at ticket creation by the Requester and is never modified by IT Staff/Admin.
- BR-14: IT Priority initially copies Requested Priority at creation and may thereafter be changed only by IT Staff or Administrator.

**Status workflow**
- BR-15: Permitted statuses are: New, Open, In Progress, Waiting for Requester, Resolved, Closed, Reopened, Cancelled.
- BR-16: A new ticket always starts in status New.
- BR-17: Only IT Staff/Administrator may change `currentStatus`; a Requester may never set status directly.
- BR-18: Permitted transitions (enforced server-side):
  | From | To |
  |---|---|
  | New | Open, In Progress, Cancelled |
  | Open | In Progress, Waiting for Requester, Cancelled |
  | In Progress | Waiting for Requester, Resolved, Cancelled |
  | Waiting for Requester | In Progress, Resolved, Cancelled |
  | Resolved | Closed, Reopened |
  | Closed | Reopened |
  | Reopened | In Progress, Waiting for Requester, Cancelled |
  | Cancelled | *(terminal — no further transitions)* |
- BR-19: An attempt to apply a status value that is not a permitted transition from the ticket's current status (per BR-18) must return 409 (Conflict) and must not change `currentStatus`; an attempt to submit a status value that isn't one of the 8 valid statuses at all must return 400 (malformed input) instead, per the FR-07 policy.
- BR-20: Lab 3 does not block Resolved/Closed on incomplete Actions Taken (deferred to Lab 4).

**Comments and notes**
- BR-21: Public Comments are visible to the ticket's Requester, all IT Staff, and all Administrators.
- BR-22: Internal Notes are visible only to IT Staff and Administrator; the API must never include Internal Notes in any payload returned to a Requester, and a Requester requesting the Internal Notes endpoint directly must be rejected (403) without leaking note content or count.
- BR-23: Comment/Note content is limited to 2,000 characters and is rejected if empty/whitespace-only; content is stored as plain text and rendered escaped (no raw HTML) on the client.
- BR-24: Every Comment/Note records its author (from the authenticated session, not client input) and server-generated timestamp.

**Administrator/account rules**
- BR-25: Email addresses are unique across all users (case-insensitive comparison), regardless of role.
- BR-26: Creating or editing a user requires exactly one of the three permitted roles; no user may hold zero or multiple roles.
- BR-27: An Administrator may not deactivate their own account (self-service safety rule).
- BR-28: The system must always have at least one active Administrator; an update that would deactivate or reassign the role of the last active Administrator must be rejected with a 409 conflict.
- BR-29: Deactivation is used instead of deletion; no endpoint permanently removes a user record in Lab 3.
- BR-30: Setting a new initial password for a user immediately sets `mustChangePassword = true` for that user; the user's existing session, if any, is not automatically revoked in Lab 3 (out of scope: session invalidation on password reset), but the next login will require the change.

**Migration/regression**
- BR-31: All Lab 2 Tickets and Attachments must retain correct ownership after migrating `RequesterUser` rows into `User` rows with role `REQUESTER`.
- BR-32: The Development Requester selector and any client-side "current requester" state must be fully removed; no code path may allow selecting a requester identity outside of authenticated login.

## 6. UI Specification Summary
Full detail, wireframe-level structure, states, and responsive layout are in `ui-spec.md`. Summary:
- **Login / Change Password** (`/login`): email+password form → on `mustChangePassword`, redirect to a mandatory Change Password form; both reuse Zen Green form components. States: idle, validating, submitting, invalid-credentials, inactive-account (same generic message), success.
- **App Shell**: navbar shows current user's name + role badge and a Logout action; nav items are filtered by role (`My Tickets`/`Create Ticket` for Requester, `My Queue` for IT Staff/Admin, `Admin` for Administrator).
- **Requester Ticket Detail**: Lab 2 layout + new Public Comments panel (post + list) + "Mark problem appears resolved" action; Internal Notes tab is not rendered for this role.
- **IT Staff Ticket Queue** (`/queue`): search bar, filter panel (status/category/priority/owner), sortable table columns (per handout example fields), pagination, empty/no-results/loading/error states, row click → Ticket Detail.
- **IT Staff Ticket Detail**: Lab 2 read-only fields + editable Ticket Owner (claim/reassign dropdown), editable IT Priority, status dropdown limited to permitted transitions from current status, tabbed Public Comments / Internal Notes / Attachments (visually distinct styling, per handout §8.4), all with loading/success/validation/forbidden/failure feedback.
- **Administrator User Management** (`/admin/users`): list (Name, Email, Role, Status, Edit) + search + role filter + Create User action opening a side panel form (name, email, role, active toggle, initial password); Edit reuses the same panel; Deactivate action guarded by BR-27/BR-28 with a clear error toast when blocked.

Every screen above must, at minimum, define and visibly distinguish these states (detailed per-screen in `ui-spec.md`): create/view/edit mode, loading/processing, field-level validation, success confirmation, empty state, no-results-for-filter state, forbidden (403), not-found (404), conflict (409, e.g. duplicate email or last-admin block), and safe generic failure (5xx) — none of which may expose stack traces or raw error payloads to the user.

All required screens must remain usable at desktop, tablet, and mobile widths, with no horizontal overflow, clipping, overlapping controls, or unreachable actions at any breakpoint; this is verified with the screenshot evidence required in handout §9 (Part 9) and covered by responsive tests in `tests.md`.

## 7. Data Changes
See full schema in the migration PR; summary of additions/changes to `server/prisma/schema.prisma`:

- **New `Role` enum**: `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`.
- **New `User` model** (replaces `RequesterUser` as the identity table): `id`, `name`, `email` (unique, case-insensitive via a citext or normalized-lowercase column), `passwordHash`, `role`, `isActive` (default true), `mustChangePassword` (default true for admin-created accounts), `createdAt`, `updatedAt`. Relations: `ticketsCreated` (Requester side, was `RequesterUser.tickets`), `ticketsOwned` (IT Staff/Admin side, new), `comments`, `notes`.
- **`Ticket` changes**: rename the `requester` relation to point at `User` (role `REQUESTER`) instead of `RequesterUser`; add nullable `ownerId` → `User` (role `IT_STAFF`/`ADMINISTRATOR`), add `problemAppearsResolved` boolean (default false, settable by Requester), extend `TicketStatus` enum with `OPEN`, `WAITING_FOR_REQUESTER`, `REOPENED`, `CANCELLED` (existing `NEW`, `IN_PROGRESS`, `RESOLVED`, `CLOSED` retained).
- **New `PublicComment` model**: `id`, `ticketId` → `Ticket`, `authorId` → `User`, `content`, `createdAt`.
- **New `InternalNote` model**: same shape as `PublicComment`, separate table (not a shared polymorphic table) so a bug can never leak notes into the public-comment query path.
- **Indexes**: `User.email` (unique), `Ticket.ownerId`, `Ticket.currentStatus`, `PublicComment.ticketId`, `InternalNote.ticketId`.

**Migration strategy**: a single Prisma migration renames `RequesterUser` → `User`, adds the new columns/enum values, backfills `role = 'REQUESTER'`, `passwordHash` = bcrypt hash of a documented local-dev seed password, and `mustChangePassword = true` for all pre-existing rows. Existing `Ticket.requesterId` foreign keys are preserved as-is (same column, retargeted to the renamed table), so no ticket ownership data is lost.

### Seed Data
- The seed script (`server/prisma/seed.ts`) must be idempotent: re-running it must not create duplicate users, duplicate tickets, or duplicate comments/notes (upsert by a stable natural key such as email for users and ticket number for tickets).
- Seed at least:
  - 4 active Requester users and 1 inactive Requester user.
  - 3 active IT Staff users and 1 inactive IT Staff user.
  - 1 active Administrator user.
- Seed a realistic spread of Tickets covering:
  - all 8 required statuses represented at least once;
  - a mix of Requested Priority and IT Priority values, including tickets where they differ;
  - both unassigned tickets and tickets assigned across at least two different IT Staff owners;
  - tickets belonging to at least three different Requesters.
- Seed example Public Comments and Internal Notes on at least two tickets each, with content that is clearly placeholder/test data (no sensitive or real personal information).
- Seeded passwords are for local development only, are documented in the README and in code comments next to the seed script, and are never real credentials or committed secrets beyond the intentionally-public local-dev defaults.

## 8. API Contract
Full endpoint list, request/response shapes, and status codes are in `api-spec.md`. Summary of new/changed endpoint groups:
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/change-password`.
- Existing `/api/tickets*` and `/api/attachments*` endpoints unchanged in shape, but now derive the acting Requester from the session instead of a `requesterId` request parameter. **Correction**: attachment creation is `POST /api/tickets/:id/attachments` (as implemented in `server/src/routes/tickets.ts`'s `ticketsRouter`), not a flat `POST /api/attachments`; and the ownership-failure status code on these Lab 2 endpoints changes from 403 to 404 per FR-07/AC-28 (see the migration note under the table in §8's Overview below) — this is a required Lab 3 code change to existing handlers, not only new documentation.
- `GET /api/staff/tickets` (queue, with `q`, `status`, `category`, `priority`, `ownerId`, `sort`, `page`, `pageSize`), `GET /api/staff/tickets/:id`, `PATCH /api/staff/tickets/:id/owner`, `PATCH /api/staff/tickets/:id/priority`, `PATCH /api/staff/tickets/:id/status`.
- `GET/POST /api/tickets/:id/comments`, `GET/POST /api/staff/tickets/:id/notes` (notes route is staff-only at the routing layer *and* re-checked in the handler).
- `PATCH /api/tickets/:id/resolved-flag` (Requester marks "problem appears resolved").
- `GET /api/admin/users`, `POST /api/admin/users`, `PATCH /api/admin/users/:id`, `POST /api/admin/users/:id/reset-password`.

Auth mechanism: session cookie (httpOnly, `SameSite=Lax`, `secure` in production), session id stored server-side (in-memory/DB-backed session store for this course stack), 8-hour idle expiration. Chosen over a bare JWT-in-localStorage approach specifically because it keeps the credential out of reach of client-side JS (mitigates XSS token theft) and makes logout a real server-side invalidation rather than a client-side no-op — both directly required by BR-06 and the handout's "authentication secrets must not be exposed to client code" instruction.

### API Contract Overview
Full request/response bodies live in `api-spec.md`; this table is the quick-reference contract used to drive the authorization matrix and test plan.

| Method | Endpoint | Role | Success | Main Errors |
|---|---|---|---|---|
| POST | /api/auth/login | Public | 200 | 400, 401 |
| POST | /api/auth/logout | Authenticated | 204 | 401 |
| GET | /api/auth/me | Authenticated | 200 | 401 |
| POST | /api/auth/change-password | Authenticated | 200 | 400, 401 |
| POST | /api/tickets | Requester | 201 | 400, 401 |
| GET | /api/tickets | Requester (own) | 200 | 401 |
| GET | /api/tickets/:id | Requester (owner only) | 200 | 401, 404 |
| PATCH | /api/tickets/:id/resolved-flag | Requester (owner only) | 200 | 400, 401, 404 |
| POST | /api/tickets/:id/attachments | Requester (owner only) | 201 | 400, 401, 404 |
| GET | /api/attachments/:id | Requester (owner only) | 200 | 401, 404 |
| GET | /api/attachments/:id/download | Requester (owner only) | 200 | 401, 404 |
| DELETE | /api/attachments/:id | Requester (owner only) | 200 | 400, 401, 404 |
| GET | /api/staff/tickets | IT Staff, Administrator | 200 | 401, 403 |
| GET | /api/staff/tickets/:id | IT Staff, Administrator | 200 | 401, 403, 404 |
| PATCH | /api/staff/tickets/:id/owner | IT Staff, Administrator | 200 | 400, 401, 403, 404, 409 |
| PATCH | /api/staff/tickets/:id/priority | IT Staff, Administrator | 200 | 400, 401, 403, 404 |
| PATCH | /api/staff/tickets/:id/status | IT Staff, Administrator | 200 | 400, 401, 403, 404, 409 |
| GET/POST | /api/tickets/:id/comments | Requester (owner), IT Staff, Administrator | 200/201 | 400, 401, 403, 404 |
| GET/POST | /api/staff/tickets/:id/notes | IT Staff, Administrator | 200/201 | 400, 401, 403, 404 |
| GET | /api/admin/users | Administrator | 200 | 401, 403 |
| POST | /api/admin/users | Administrator | 201 | 400, 401, 403, 409 |
| PATCH | /api/admin/users/:id | Administrator | 200 | 400, 401, 403, 404, 409 |
| POST | /api/admin/users/:id/reset-password | Administrator | 200 | 400, 401, 403, 404 |

Status codes above follow the single ordered policy in FR-07 (401 → role-403 → ownership-404 → conflict-409 → validation-400), applied identically in `api-spec.md`, so a given failure reason always maps to the same code everywhere in the system. Validation errors (400) always include a field-level message. Authorization failures on existence-sensitive resources use 404 rather than 403 (see BR-22 for the Internal Notes case), so a wrong id and someone else's id are indistinguishable.

**Migration note on the four Requester/Attachment rows above** (`GET /api/tickets/:id`, `PATCH /api/tickets/:id/resolved-flag`, `POST /api/tickets/:id/attachments`, `GET /api/attachments/:id`, `GET /api/attachments/:id/download`, `DELETE /api/attachments/:id`): the current Lab 2 implementation in `server/src/routes/tickets.ts` returns **403** ("Forbidden: You do not own this ticket/attachment") for a non-owned but existing resource. This is a real behavior change required by FR-07/AC-28, not just new-endpoint documentation — these five ownership checks must be edited in place to return 404 instead of 403, and the adapted Lab 2 regression suite (`MIG-03` in `tests.md`) must assert 404 going forward. `POST .../attachments` is listed at its real path (`/api/tickets/:id/attachments`, inside `ticketsRouter`) rather than the incorrect flat `/api/attachments` path this table previously showed.

## 9. Acceptance Criteria
- AC-01: Given an active user with valid credentials, when they log in, the backend establishes an authenticated session and `GET /api/auth/me` returns their id, name, role, and `mustChangePassword`.
- AC-02: Given a user with `mustChangePassword = true`, when login succeeds, normal application screens remain unavailable until a valid new password is saved via the change-password endpoint.
- AC-03: Given an authenticated Requester, when the client supplies a different `requesterId`/`ownerId` in a ticket-creation request, the backend still attributes the ticket to the authenticated user and ignores the client value.
- AC-04: Given a Requester account, when the Internal Notes endpoint is requested for any ticket, the response is 403 and contains no note content or count.
- AC-05: Given invalid credentials or an inactive account, the login response is the same generic error and status code in both cases.
- AC-06: Given a logged-out session, when a request is made with the old session cookie, the response is 401.
- AC-07: Given an unassigned ticket, when IT Staff calls the claim endpoint, `ownerId` is set to that IT Staff user and the ticket no longer appears in "unassigned" queue filters.
- AC-08: Given a ticket in status Closed, when a status-change request to In Progress is submitted, the request is rejected (BR-18 does not permit this transition) and `currentStatus` is unchanged.
- AC-09: Given a Requester posts a Public Comment, the comment is visible via both the Requester's ticket detail endpoint and the IT Staff ticket detail endpoint, with the correct author and timestamp.
- AC-10: Given a Requester attempts to set `currentStatus` directly, the request is rejected with 403.
- AC-11: Given an Administrator attempts to deactivate their own account, the request is rejected with 409 (Conflict) and the account remains active.
- AC-12: Given the system has exactly one active Administrator, when a request would deactivate or change that user's role, the request is rejected and the user remains an active Administrator.
- AC-13: Given an Administrator creates a user with an email that already exists (case-insensitive match), the request is rejected with 409 and no duplicate user is created.
- AC-14: Given an Administrator resets a user's password, that user's next login requires a password change before reaching the application.
- AC-15: Given a search query on the Ticket Queue, results are limited to tickets matching ticket number or summary, and pagination metadata (`page`, `pageSize`, `total`) is correct.
- AC-16: Given empty/whitespace-only content submitted to the Public Comment or Internal Note endpoint, the request is rejected with 400 and no row is created.
- AC-17: Given a migrated Lab 2 Requester's existing tickets, after migration those tickets are still retrievable through that same user's authenticated "My Tickets" view with unchanged data.
- AC-18: Given an Administrator searches the user list by a partial name or email, only matching users are returned, case-insensitively.
- AC-19: Given an Administrator applies a role filter, only users with that role are returned.
- AC-20: Given an Administrator edits a user's role from IT Staff to Requester, the change is saved and that user's next login reflects the new role's navigation and permissions.
- AC-21: Given an Administrator submits a role value outside the three permitted roles, the request is rejected with 400 and the user is unchanged.
- AC-22: Given IT Staff filters the Ticket Queue by status, priority, or owner (including "unassigned"), only matching tickets are returned; combining filters narrows results further (AND semantics).
- AC-23: Given IT Staff sorts the Ticket Queue by created date or priority, results are returned in the requested order, and an invalid `sort` parameter falls back to the documented default order rather than erroring.
- AC-24: Given a Public Comment or Internal Note longer than 2,000 characters, the request is rejected with 400 and no row is created.
- AC-25: Given an authenticated Requester, when they call any `/api/staff/*` or `/api/admin/*` endpoint, the response is 403.
- AC-26: Given an authenticated IT Staff user, when they call any `/api/admin/*` endpoint, the response is 403.
- AC-27: Given a user account is deactivated while the user still holds a valid session, the next request on that session is rejected with 401 (session is checked against current `isActive`, not cached at login time).
- AC-28: Given a Requester adds an Attachment to a ticket they do not own (by guessing/forging a ticket id), the request is rejected with 404 (existence-hiding, per the policy in §8) and no file is stored.

*(Full traceability from every AC to a specific automated test lives in `tests.md`.)*

## 10. Definition of Done
A feature is done only when all of the following hold on the `main` branch:
- The relevant FRs/BRs/ACs above are implemented and traceable to at least one passing automated test in `tests.md`.
- Every protected endpoint enforces authentication and role/ownership server-side (verified by at least one direct-API authorization test per endpoint, not just a UI check).
- No plaintext password appears anywhere in code, logs, or the repository.
- Lab 2 Requester regression tests still pass unmodified in intent (may be adapted to use authenticated session instead of the removed selector).
- Seed data satisfies §5.3 of the handout and seeding is idempotent (safe to re-run).
- UI matches Zen Green conventions and is verified responsive at desktop/tablet/mobile per `ui-spec.md`.
- `docs/lab-03/*.md` and this specification are complete, internally consistent, and predate the implementation PRs that satisfy them (commit history is evidence).
- The seed script satisfies every minimum in §7's Seed Data subsection and has been run and re-run at least once with no duplicates created (idempotency demonstrated, not just claimed).
- Every GitHub Issue listed in §11 is in Done on the project board, with a merged PR and a recorded reviewer approval in `reviewer.md`.

## 11. GitHub Issues and Workflow
Sprint 3 work is decomposed into GitHub Issues, each tracked through the same Kanban statuses used in Lab 2 (Backlog → In Progress → In Review → Done):

- Sprint 3 engineering contract (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`).
- Authentication foundation: `User` migration, password hashing, login/logout/current-user, mandatory password change, tests.
- Authorization middleware and the full role/ownership matrix, with direct-API authorization tests.
- Requester regression: remove the Development Requester selector, rewire Lab 2 endpoints/UI to the authenticated session, add Public Comments + "problem appears resolved."
- IT Staff Ticket Queue: API (search/filter/sort/pagination) + responsive UI + tests.
- IT Staff Ticket Detail: ownership claim/reassign, IT Priority, status transitions, Public Comments, Internal Notes + tests.
- Administrator User Management: list/search/filter, create/edit, role assignment, activate/deactivate, reset password, safety rules (BR-27/BR-28) + tests.
- Migration and seed data: idempotent seed script, migration verification against existing Lab 2 data.
- E2E and visual/responsive inspection: Playwright specs, desktop/tablet/mobile screenshots, Zen Green checklist.
- Final integration: merge to `lab3-staging`, staged verification, then merge to `main` with passing CI evidence.

Each Issue is implemented on its own feature branch, opened as a Pull Request into `lab3-staging`, and requires at least one reviewer approval recorded in `reviewer.md` before merge. `lab3-staging` is merged into `main` only after all Lab 3 Issues are in Done and the full test suite passes, mirroring the Lab 2 branch flow (§11.1 of the handout).

## 12. Assumptions and Decisions
- Session-cookie authentication (not JWT) is used, for the security reasons stated in §8.
- Email uniqueness is enforced case-insensitively at the application layer (normalized lowercase stored) rather than requiring a Postgres `citext` extension, to keep the migration simple for this course stack.
- Administrators are granted the same *Ticket read/operate* permissions as IT Staff (per handout §4.3's "unless the approved authorization matrix explicitly permits it" — this spec explicitly permits it) but Ticket operations are not required or exercised in the Administrator's own UI screens in Lab 3; only User Management is.
- "Problem appears resolved" is modeled as a separate boolean flag on `Ticket`, not a status value, since the handout is explicit that only IT Staff/Admin can formally resolve/close (BR-17), and a flag avoids conflating the Requester's opinion with the authoritative status.
- Rate limiting / login lockout is intentionally not implemented (BR-07), matching the handout's exclusion of advanced identity-management functions.
- Seed passwords for local development are documented in `server/prisma/seed.ts` comments and the README, and are never real credentials.
- The handout's Administrator User Management mockup (§8.5) depicts pagination controls, but §8.5's text explicitly lists "pagination for the user list" under "The following are not required," and §4.2 excludes "advanced user-list features such as mandatory pagination" more broadly. Where the illustrative mockup and the normative text conflict, this specification follows the text: `/admin/users` does not implement pagination in Lab 3. If the user list grows beyond what fits on screen, it scrolls within its container rather than paging. This decision is recorded here so it is traceable to an explicit choice rather than an oversight, per `ui-spec.md` §6.
