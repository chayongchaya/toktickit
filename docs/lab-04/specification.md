# Lab 4 Sprint Engineering Specification

## 1. Sprint Goal
Complete the core TokTickIT service-desk workflow by adding an auditable Actions Taken work log under every Ticket, closing the loop on the Ticket resolution rule so a Requester's "problem appears resolved" signal stays advisory only, giving Requesters and IT Staff a concise role-appropriate Dashboard, and hardening the full Lab 1–3 application (regression, accessibility, and Zen Green visual consistency) so the product is demonstrable end to end.

## 2. Stakeholder Request Interpretation
The service desk can already take in Tickets and let IT Staff talk to Requesters, but there is no durable record of the actual work performed, and no quick way for either a Requester or IT Staff to see "what's going on" without opening every ticket individually. This sprint adds a structured, timestamped Actions Taken log per Ticket (who did what, what happened, whether follow-up is needed), keeps the existing rule that only IT Staff/Administrator may formally change a Ticket's status, and adds two small, query-backed dashboards that summarize existing data and link back to the detailed screens rather than replacing them.

## 3. Scope

### Included
- `ActionTaken` model: one Ticket has many Actions Taken rows (parent-child); IT Staff/Administrator may create and update them.
- Actions Taken fields: Action Date/Time (server-set), Action Description, Result, Performed by (auto, from session), Follow-Up Required?, Follow-up Note (required only when follow-up is needed), Attachment Notes.
- Actions Taken area on the shared Staff Ticket Detail screen (list + create + edit); read-only Actions Taken list on the Requester Ticket Detail screen.
- `GET /api/tickets/dashboard` (Requester) and `GET /api/staff/dashboard` (IT Staff/Administrator), each backed by fresh authoritative queries, not a client-side reduction of a cached list.
- Requester Dashboard and IT Staff Dashboard screens, reachable from a new `Dashboard` nav item and set as the post-login landing page for every role.
- Final regression pass and hardening across all Lab 1–3 screens: authentication, ownership, Public Comments, Internal Notes, Attachments, Ticket Queue, User Management.
- Zen Green visual/responsive/accessibility polish on every screen touched this sprint.

### Explicitly Excluded (handout §4.2)
- Automatic SLA clocks, escalation engines, on-call scheduling, breach notifications.
- Email/SMS/LINE/push or any other external notification service.
- Inventory, spare-parts, purchasing, or cost accounting.
- Time-sheet billing, payroll, or labor-cost calculation.
- Multi-level approval workflows and electronic signatures.
- Custom report builders, BI tooling, export warehouses.
- Multi-tenant organizations and production-scale operations concerns.
- A new "Actions Taken required before Resolved" gate — the handout's mandatory rule is that IT Staff *must review the work and formally update the Ticket*, which the existing staff-only status-change rule already satisfies; requiring a minimum number of Actions Taken rows before Resolved is not requested and is deferred (see §11).

## 4. Functional Requirements

**Actions Taken**
- FR-01: The system must let an authenticated IT Staff or Administrator user create an Actions Taken row on any existing Ticket, capturing Action Description, Result, Follow-Up Required?, an optional Follow-up Note, and optional Attachment Notes.
- FR-02: The system must set Action Date/Time and Performed by automatically from the server clock and the authenticated session; neither may be supplied or overridden by the client.
- FR-03: The system must let an authenticated IT Staff or Administrator user edit the Description, Result, Follow-Up Required?, Follow-up Note, and Attachment Notes of an existing Actions Taken row; the original Performed by and Ticket association never change.
- FR-04: The system must reject an Actions Taken create or update request when Action Description or Result is empty/whitespace-only, or exceeds 2,000 characters, with 400 and no row created/changed.
- FR-05: The system must reject an Actions Taken create or update request when Follow-Up Required? is true and Follow-up Note is empty/whitespace-only, with 400 and no row created/changed.
- FR-06: The system must return every Actions Taken row for a Ticket, oldest first, to both the owning Requester (read-only) and to IT Staff/Administrator (read/write) on their respective ticket detail endpoints.
- FR-07: A Requester must never be able to create or update an Actions Taken row, on any Ticket, including one they own; the backend must reject such a request with 403 regardless of what the client UI shows.

**Dashboards**
- FR-08: The system must expose a Requester Dashboard endpoint returning, for the authenticated Requester only: a count of open Tickets, a count of Tickets waiting for the Requester, a count of Resolved Tickets, a count of Closed Tickets, and up to 5 recently updated Tickets.
- FR-09: The system must expose an IT Staff/Administrator Dashboard endpoint returning: counts of Tickets in New, Open, In Progress, and Waiting for Requester; a count of Tickets owned by the current user (My Assigned); a count of unassigned, not-yet-resolved Tickets; and up to 5 of the current user's most recently updated owned Tickets.
- FR-10: Every dashboard count must be computed by a fresh backend query against authoritative data at request time, not cached or derived on the client from a previously fetched list.
- FR-11: Each dashboard metric card must be an accessible link/drill-down to the corresponding filtered Ticket Queue or My Tickets view.
- FR-12: A Dashboard requested by a user with zero matching Tickets must return zero-value counts and an empty recent-tickets list (200 OK), never an error.

**Final hardening**
- FR-13: All Lab 1–3 endpoints and screens (authentication, Requester Ticket CRUD/Attachments, IT Staff Queue/Detail/ownership/priority/status, Public Comments, Internal Notes, Administrator User Management) must continue to function exactly as specified in their own labs' specifications after this sprint's migration and code changes.
- FR-14: Every screen touched or added in this sprint must remain usable with no horizontal overflow, clipped content, or overlapping controls at desktop, tablet, and mobile widths, and must preserve visible keyboard focus and non-color status cues.

## 5. Business Rules

**Actions Taken**
- BR-01: An Actions Taken row belongs to exactly one Ticket (BR-01 per handout §4.4 example) and can never be re-parented to a different Ticket by any client-supplied field.
- BR-02: The Ticket Owner coordinates the Ticket as a whole, but any active IT Staff/Administrator — not only the current Ticket Owner — may create an Actions Taken row against it, and Performed by always reflects the actual author, which may differ from the Ticket Owner (handout §4.4 example).
- BR-03: Any active IT Staff/Administrator may edit any Actions Taken row on a Ticket they can access, not only the original author (matches the existing Internal Notes staff-wide-edit-adjacent pattern already used for ownership/priority); editing never changes Performed by, Action Date/Time (the original creation moment), or the parent Ticket.
- BR-04: Follow-up Note is required exactly when Follow-Up Required? is true, and is cleared (stored as null) whenever Follow-Up Required? is false, both on create and on update.
- BR-05: Action Description, Result, Follow-up Note, and Attachment Notes are each capped at 2,000 characters, matching the existing Public Comment/Internal Note text-length rule from Lab 3.
- BR-06: A Requester may view every field of every Actions Taken row on a Ticket they own, but has no route capable of creating, editing, or removing one (unlike Internal Notes, which a Requester cannot even see — handout §8.3 explicitly distinguishes this).
- BR-07: A legacy Ticket that predates this sprint's migration has zero Actions Taken rows by default; this is a normal, valid state (an empty list), never an error condition, on every screen and endpoint.

**Ticket status and resolution (carried forward from Lab 3, reconfirmed for Lab 4)**
- BR-08: Permitted statuses remain: New, Open, In Progress, Waiting for Requester, Resolved, Closed, Reopened, Cancelled.
- BR-09: Only IT Staff/Administrator may change a Ticket's `currentStatus`; a Requester may never set status directly, and the backend enforces this even if a client bypasses the normal screen.
- BR-10: The permitted transition matrix (unchanged from Lab 3):

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

- BR-11: An attempted status change that is not a permitted transition from the Ticket's current status must be rejected with 409 (Conflict) and must not change `currentStatus`.
- BR-12: A Requester's "problem appears resolved" flag (`problemAppearsResolved`) is advisory only; setting it never changes `currentStatus`, and IT Staff/Administrator must still formally transition the Ticket (handout §4.5's mandatory rule). This sprint does not add a rule requiring at least one Actions Taken row before a Ticket may become Resolved — see the Assumptions in §11 for why.

**Dashboards**
- BR-13: A Requester's Dashboard counts and recent-ticket list are scoped to Tickets where that Requester is the `requesterId`; a Requester's Dashboard must never include another Requester's data.
- BR-14: An IT Staff/Administrator's "My Assigned" count and recent-ticket list are scoped to Tickets where that user is the `ownerId`; the New/Open/In Progress/Waiting for Requester counts and Unassigned count are queue-wide (not scoped to the current user), matching the mockup in handout §8.1.
- BR-15: "Unassigned" on the IT Staff Dashboard counts Tickets with no owner that are not already Resolved, Closed, or Cancelled (an unassigned-but-finished Ticket is not an operational backlog item).
- BR-16: The Requester Dashboard endpoint is restricted to Requester role. An IT Staff or Administrator caller receives 403 and must use the Staff Dashboard endpoint; the backend enforces this restriction regardless of the client UI.

### Authorization Matrix

| Operation | Requester | IT Staff | Administrator | Backend enforcement |
|---|---|---|---|---|
| View own Ticket + Actions Taken | Allow | Allow on accessible Ticket | Allow on accessible Ticket | Yes |
| View another Requester's Ticket | Deny | N/A | N/A | Yes |
| Create Actions Taken | Deny (403) | Allow on accessible Ticket | Allow on accessible Ticket | Yes |
| Edit Actions Taken | Deny (403) | Allow on accessible Ticket | Allow on accessible Ticket | Yes |
| Change Ticket status | Deny (403) | Allow only permitted transitions | Allow only permitted transitions | Yes |
| Requester Dashboard | Allow own data only | Deny (403) | Deny (403) | Yes |
| Staff Dashboard | Deny (403) | Allow | Allow | Yes |

The UI may hide controls for disallowed roles, but every write and dashboard-role restriction is enforced by the backend.

## 6. UI Specification Summary
Full detail (states, responsive layout, empty/forbidden/safe-failure feedback) is in `ui-spec.md`. Summary:
- **App Shell / Navbar**: a new `Dashboard` nav item is the first item for every role, with active-page indication (handout §7); it is also the post-login and post-password-change landing page for every role.
- **Requester Dashboard** (`/dashboard` for role Requester): 4 metric cards (My Open Tickets, Waiting for Me, Resolved, Closed) each drilling into `/tickets` (filtered where applicable), a "My Recent Tickets" panel (up to 5, links to Ticket Detail, "View all" → `/tickets`), and Quick Actions (Create Ticket, View My Tickets). Does not duplicate the full My Tickets table.
- **IT Staff/Administrator Dashboard** (`/dashboard` for role IT Staff/Administrator): 6 metric cards (New, Open, In Progress, Waiting for Requester, My Assigned, Unassigned) each drilling into `/queue` with the matching filter, a "My Recent Tickets" panel scoped to the current user's owned Tickets, a manual Refresh action, and Quick Actions (My Queue, and Manage Users for Administrators).
- **Staff Ticket Detail — Actions Taken tab**: list of existing Actions Taken (newest action's author, timestamp, Description, Result, Follow-Up Required?, Follow-up Note when applicable, Attachment Notes when present) with an "Edit" action per row, an "Add Action Taken" button opening a create form, and the same form reused in place for editing. Follow-up Note only appears/is required once Follow-Up Required? is checked.
- **Requester Ticket Detail — Actions Taken section**: the same fields, read-only, no create/edit control, with its own empty state ("No actions have been recorded on this ticket yet.").
- **Ticket Workflow / Resolution Feedback**: unchanged from Lab 3 — status control shows only permitted next statuses per BR-10, and a successful change refreshes the Ticket summary status; the Requester's resolved-flag button remains the only resolution-adjacent action available to that role.

All screens above must remain usable at desktop, tablet, and mobile widths with no horizontal overflow, clipping, or overlapping controls, per `ui-spec.md`'s screenshot evidence requirement.

## 7. Data Changes
Full schema is in `server/prisma/schema.prisma`; migration SQL is in `server/prisma/migrations/20260924090000_lab4_actions_taken/migration.sql`.

- **New `ActionTaken` model**: `id` (PK), `ticketId` → `Ticket` (`onDelete: Cascade`), `actionDateTime` (default now), `description`, `result`, `performedById` → `User`, `followUpRequired` (default false), `followUpNote` (nullable), `attachmentNotes` (nullable), `createdAt`, `updatedAt`.
- **`Ticket` change**: adds the `actionsTaken ActionTaken[]` relation. No existing `Ticket` column, index, or enum is modified.
- **`User` change**: adds the `actionsTaken ActionTaken["ActionPerformedBy"]` relation. No existing `User` column is modified.
- **Indexes**: `ActionTaken.ticketId`, `ActionTaken.performedById` — matching the existing `PublicComment.ticketId`/`InternalNote.ticketId` indexing pattern for the same reason (every ticket-detail read fetches its full child list).
- **No enums added.** Follow-Up Required? is a plain boolean rather than a reference table, since the handout only asks for a yes/no plus a conditional note, not a categorized set of follow-up types.

**Design decisions (justification, handout §5.1):**
1. **`ActionTaken` is editable, not append-only**, unlike `PublicComment`/`InternalNote`. The handout's UI requirement (§8.3) explicitly asks for a "create mode and view/edit mode," so `updatedAt` is tracked for future optimistic-concurrency use, and the API never trusts a client-supplied `id`, `ticketId`, or `performedById` on update — only the four editable fields are accepted.
2. **`performedById` is a required foreign key set only from the session**, mirroring `PublicComment.authorId`/`InternalNote.authorId`, rather than an open text field, so "Performed by (auto)" cannot be spoofed and so a deactivated user's historical actions remain attributable.

**Migration strategy**: a single additive Prisma migration creates the `ActionTaken` table; it adds no column to any existing table and drops nothing, so it cannot destroy Lab 1–3 data. A legacy Ticket simply has zero related `ActionTaken` rows after migration (BR-07) — every read path (`include`/`select`) treats an empty array as the normal case, and the dashboard queries never assume at least one row exists per Ticket.

**Rollback**: the migration's `down` path (implicit via `prisma migrate resolve`/table drop) only removes the new `ActionTaken` table; no other table is touched, so rollback is safe and non-destructive to Lab 1–3 data. This was verified by applying the migration to a copy of the Lab 3 database, confirming existing Ticket/User/Attachment/PublicComment/InternalNote row counts were unchanged, then reverting.

### Migration verification and recovery
- `MIGRATION-01` applies the Lab 4 migration to a copy of the Lab 3 database and verifies that all pre-existing Ticket, User, Attachment, PublicComment, and InternalNote rows remain intact.
- `MIGRATION-02` verifies that legacy Tickets without Actions Taken return `actionsTaken: []` and remain valid dashboard records.
- Recovery is verified by restoring the pre-migration database backup after a failed migration in a disposable test database; production data is never used for destructive migration testing.

### Seed Data
- Idempotent: seeding matches existing rows by `(ticketNumber, description)` for `ActionTaken` before inserting, safe to re-run.
- At least one Ticket has zero Actions Taken, at least one has exactly one, and at least two have multiple (with at least one pending Follow-up), satisfying handout §5.3 and giving both non-zero and zero dashboard/queue metrics real data to demonstrate.

## 8. API Contract
Full endpoint list, request/response shapes, and status codes are in `api-spec.md`. Summary of new endpoints:
- `POST /api/staff/tickets/:id/actions` — create an Actions Taken row (IT Staff/Administrator only).
- `PATCH /api/staff/tickets/:id/actions/:actionId` — update an existing Actions Taken row (IT Staff/Administrator only).
- `GET /api/tickets/:id` (existing Requester route) — now also returns `actionsTaken` (read-only) for the Requester's own Ticket.
- `GET /api/staff/tickets/:id` (existing Staff route) — now also returns `actionsTaken`.
- `GET /api/tickets/dashboard` — Requester Dashboard metrics (authenticated Requester only; IT Staff/Administrator receive 403; registered ahead of the existing `GET /api/tickets/:id` route so the literal path segment is never parsed as a Ticket id).
- `GET /api/staff/dashboard` — IT Staff/Administrator Dashboard metrics.
- All Lab 2/3 endpoints continue unchanged in shape and behavior.

## 9. Acceptance Criteria
- AC-01: Given a permitted IT Staff user and valid data, when an Actions Taken is created, then it is saved under the correct Ticket with the authenticated creator as Performed by (handout example).
- AC-02: Given an authenticated Requester, when dashboard data is retrieved, then only metrics and recent Tickets owned by that Requester are returned (handout example).
- AC-03: Given a Requester, when they call `POST` or `PATCH` on any Actions Taken endpoint, the response is 403 and no row is created or changed.
- AC-04: Given Follow-Up Required? is true and Follow-up Note is blank, when an Actions Taken create or update is submitted, the response is 400 and no row is created/changed.
- AC-05: Given Action Description or Result is blank or exceeds 2,000 characters, when an Actions Taken create or update is submitted, the response is 400 and no row is created/changed.
- AC-06: Given an Actions Taken row created by one IT Staff member, when a different IT Staff member edits it, the update succeeds and Performed by is unchanged.
- AC-07: Given an Actions Taken id that does not belong to the Ticket id in the URL, when an update is submitted, the response is 404 and the row is unchanged.
- AC-08: Given a Ticket with zero Actions Taken, when its detail is retrieved by either role, `actionsTaken` is an empty array, not an error.
- AC-09: Given a Requester marks "problem appears resolved," `currentStatus` does not change and the change is visible only as the advisory flag.
- AC-10: Given only IT Staff/Administrator, when they set `currentStatus` to a permitted next value, the change succeeds and the Ticket summary reflects the new status.
- AC-11: Given a Requester with zero Tickets, when their Dashboard is requested, all counts are 0 and `recentTickets` is an empty array, with 200 OK.
- AC-12: Given an IT Staff user claims an unassigned Ticket, the next Dashboard request shows My Assigned incremented by one and Unassigned decremented by one.
- AC-13: Given an unauthenticated request to either dashboard endpoint, the response is 401.
- AC-14: Given a Requester requests `/api/staff/dashboard`, the response is 403.
- AC-15: Given any Lab 1–3 endpoint (authentication, Requester ticket/attachment ownership, IT Staff queue/ownership/priority/status, Public Comments, Internal Notes, Administrator user management), it continues to behave exactly as specified in its own lab's acceptance criteria after this sprint.
- AC-16: Given any screen added or changed this sprint, at desktop, tablet, and mobile widths there is no horizontal page scroll, clipped content, or overlapping control.
- AC-17: Given an authenticated IT Staff or Administrator requests `/api/tickets/dashboard`, the response is 403 and no Requester-scoped dashboard data is returned.

*(Full traceability from every AC to a specific automated test lives in `tests.md`; in particular, AC-17 has a dedicated authorization test row.)*

## 10. Definition of Done
A feature is done only when all of the following hold on the `main` branch:
- The FRs/BRs/ACs above are implemented and each traces to at least one passing automated test in `tests.md`.
- `POST`/`PATCH` on the Actions Taken endpoints enforce authentication and role server-side, verified by direct-API authorization tests, not just a UI check.
- The Lab 4 migration is additive only; a diff against the Lab 3 database schema shows no dropped or altered Lab 1–3 column, table, or enum value.
- Lab 1–3 regression tests still pass unmodified in intent.
- Seed data satisfies §5.3 of the handout (zero/one/multiple Actions Taken per Ticket) and seeding is idempotent.
- Both dashboards match their documented calculations in `api-spec.md`/`ui-spec.md`, verified by comparing a dashboard's displayed numbers against a direct database query during manual testing.
- UI matches Zen Green conventions and is verified responsive at desktop/tablet/mobile per `ui-spec.md`.
- Recoverable API failures preserve entered Actions Taken form data; validation, 401, 403, 404, 409, and 5xx failures are surfaced safely without exposing stack traces or database details.
- Create/Update controls prevent duplicate submissions while a request is in flight; retry behavior is safe and does not create unintended duplicate client submissions.
- The final test suite includes dedicated unit, API/integration, UI component, UI style, responsive, authorization, workflow, migration/regression, performance-smoke, accessibility, and E2E coverage.
- Migration and seed tests verify additive schema evolution, legacy Tickets with zero Actions Taken, zero/one/multiple Action Taken seed states, realistic status/priority/assignment coverage, and idempotent re-seeding.
- `docs/lab-04/*.md` is complete, internally consistent, and predates the implementation PRs that satisfy it (commit history is evidence).
- Every GitHub Issue listed in §12 is in Done on the project board, with a merged PR and a recorded reviewer approval in `reviewer.md`.

## 11. Assumptions and Decisions
- **Performance-smoke threshold.** Lab 4 does not prescribe a numeric SLA. Performance-smoke tests therefore verify that both dashboard endpoints complete successfully with the seeded dataset and record elapsed time; any numeric threshold used for grading is taken from the instructor/CI environment rather than invented here.
- **Requester Dashboard authorization.** `/api/tickets/dashboard` is restricted to Requester role; IT Staff and Administrator use `/api/staff/dashboard`. This keeps role separation explicit and prevents exposing a requester-scoped endpoint to staff roles unnecessarily.
- **No minimum-Actions-Taken gate on Resolved.** The handout's mandatory rule is that "IT Staff must review the work and formally update the Ticket," which is already satisfied by BR-09 (only staff can change status) carried forward from Lab 3. Requiring at least one Actions Taken row before a Ticket may move to Resolved was considered but not added, since it is not explicitly requested and would risk blocking a legitimate quick resolution (e.g., a duplicate-ticket cancellation-adjacent case) that never needed a logged action. This is flagged here as a deliberate scope decision, open to revisiting with the instructor/TA.
- **Any IT Staff/Administrator may edit any Actions Taken row**, not only its original author, matching how ownership/priority/status can already be changed by any staff member regardless of who is the current Ticket Owner (BR-02/BR-03). This supports shift handoff (e.g., correcting a colleague's typo) without adding a new "author-only edit" restriction the handout never asked for.
- **`GET /api/tickets/dashboard` is a literal path registered ahead of `GET /api/tickets/:id`** rather than a nested resource under a different base path, to keep the Requester-facing API surface under the single `/api/tickets` prefix already used for every other Requester Ticket operation.
- **Dashboard "recent tickets" caps at 5 rows** on both dashboards, matching the mockup in handout §8.1/§8.2 and keeping the response "concise" per the dashboard contract in §6.2 of the handout.
- **Requester Dashboard card choice.** The Requester dashboard uses four cards — My Open Tickets, Waiting for Me, Resolved, and Closed — while the "recently updated" requirement is represented by the separate My Recent Tickets list. This is an intentional concise-dashboard choice; it does not replace the full My Tickets screen.
- **`/dashboard` is the single post-login landing route for every role**, rendering a different component per role, so the Navbar's `Dashboard` link and browser history behave identically across roles (one URL, not `/dashboard/requester` vs `/dashboard/staff`).
- Seed passwords remain the same local-development-only credentials documented in `server/prisma/seed.ts` and the README, unchanged from Lab 3.

## 12. GitHub Issues and Workflow
Sprint 4 work is decomposed into GitHub Issues, tracked through the same Kanban statuses used in Labs 2–3 (Backlog → In Progress → In Review → Done):
- Sprint 4 engineering contract (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`).
- Actions Taken foundation: Prisma migration, model, seed data, create/update APIs, authorization, tests.
- Actions Taken UI: Staff Ticket Detail list/create/edit, Requester Ticket Detail read-only view, responsive layout, tests.
- Ticket workflow regression: confirm the resolution gate and transition matrix still hold end to end with Actions Taken present.
- Role dashboards: Requester and IT Staff dashboard APIs, metrics, drill-down, UI, tests.
- Final hardening: full Lab 1–3 regression pass, accessibility, visual consistency, error-handling review, release verification.

Each Issue is implemented on its own feature branch, opened as a Pull Request into `lab4-staging`, and requires at least one reviewer approval recorded in `reviewer.md` before merge. `lab4-staging` is merged into `main` only after all Lab 4 Issues are in Done and CI is green.
