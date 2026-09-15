# Lab 3 Test Plan and Traceability Matrix

> This plan is written against `docs/lab-03/specification.md` before implementation, per handout §10
> ("The plan must be created before or alongside implementation... not reconstructed afterward").
> Each status starts as **Planned** and is updated to **Pass** only when the real test file is committed
> and the test has passed. No AC may be marked done on the strength of this document alone.

## 1. Test Strategy

Testing follows the same pyramid used in Lab 2, extended with two categories the handout requires
explicitly for Lab 3: **Security/Authorization** and **Migration/Regression**.

- **Unit** — pure logic with no I/O: the password-policy validator (BR-04) and the status-transition
  matrix (BR-18/BR-19). Cheap to run, used to pin down every edge case in the matrix without spinning up
  a database.
- **API/Integration** — every endpoint in `api-spec.md` exercised against a test database: auth, staff
  queue/detail, comments/notes, admin users. Covers success paths and the FR-07 status-code policy
  (401/403/404/409/400) for each failure mode.
- **Security/Authorization** — a dedicated file (`authorization.api.test.ts`) that specifically drives
  cross-role and cross-ownership access attempts (Requester → staff routes, IT Staff → admin routes,
  forged ids in request bodies, direct access to another user's ticket/attachment/notes). Kept separate
  from the happy-path API tests so a reviewer can see authorization coverage at a glance.
- **UI (component)** — React components tested in isolation with mocked API calls: loading/empty/error/
  validation/success states for Login, Change Password, Staff Queue, Staff Ticket Detail, and User
  Management.
- **UI Style** — Zen Green token/class checks extended for the new role badge, the 8 status badges, and
  the visual distinction between Public Comments and Internal Notes.
- **Responsive** — screenshot-based checks (Playwright) at desktop/tablet/mobile widths for every major
  Lab 3 screen, checking for overflow/clipping/overlap.
- **Migration/Regression** — runs the Lab 3 migration against Lab-2-seeded data and re-verifies existing
  Lab 2 Requester API tests still pass once adapted to use an authenticated session instead of the
  removed Development Requester selector.
- **E2E** — a small number of full-stack flows: login → forced password change → role-correct shell;
  logout → blocked direct navigation; IT Staff claim/comment/note/status flow; Admin create/duplicate-
  email/reset-password/self-deactivation-blocked flow.

This shape puts the bulk of authorization and business-rule coverage at the API/security level, where a
failure is fast and easy to localize to one endpoint, and reserves UI/E2E tests for behavior that only
exists once the screens are actually rendered (loading states, responsive layout, visual distinction
between Public Comments and Internal Notes, full user flows).

## 2. Planned Tests

| Test ID | AC / BR Ref | Level | What It Tests | Expected Result | Test File Path | Status |
|---|---|---|---|---|---|---|
| UNIT-01 | BR-04 | Unit | Password policy validator: length, upper/lower/digit/special-char rules | Rejects each missing rule individually; accepts a password meeting all four | `server/tests/lab-03/password-policy.unit.test.ts` | Planned |
| UNIT-02 | BR-18, BR-19 | Unit | Status transition matrix returns permitted next-statuses for each of the 8 statuses | Matches BR-18 exactly; Cancelled returns an empty set (terminal) | `server/tests/lab-03/status-transition.unit.test.ts` | Pass |
| UNIT-03 | BR-03 | Unit | Password hashing utility: hash a known password | Returned hash matches the bcrypt `$2` format, is never equal to the plaintext input, and re-hashing the same input twice gives two different salted hashes | `server/tests/lab-03/password-hash.unit.test.ts` | Planned |
| API-01 | AC-01 | API | Login with valid active-user credentials | 200; session cookie set; `/api/auth/me` returns id, name, role, `mustChangePassword` | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-02 | AC-05 | API | Login with wrong password vs. an inactive account's correct password | Identical generic 401 body/status in both cases | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-03 | AC-02 | API | Any non-auth endpoint called while `mustChangePassword = true` | 403; only logout and change-password remain reachable | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-04 | AC-02 | API | Change password with a valid new password (BR-04), then re-authenticate | `mustChangePassword` flips to false; subsequent requests succeed normally | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-05 | BR-05 | API | Change-password attempt reusing the current temporary password as the "new" password | 400; password unchanged | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-06 | AC-06 | API | Logout, then replay the old session cookie on any protected endpoint | 401 | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-07 | AC-27 | API | Admin deactivates a user mid-session; that user's existing session cookie is replayed | 401 (activation is re-checked per request, never cached at login) | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-07b | BR-07 | API | 10 consecutive failed login attempts for the same account | Every attempt returns the same generic 401; no lockout, no escalating delay (explicitly out of scope) | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-08 | AC-25 | Security | Requester session calls `GET /api/staff/tickets` and `GET /api/admin/users` | 403 for both | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| API-09 | AC-26 | Security | IT Staff session calls any `/api/admin/*` endpoint | 403 | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| API-10 | AC-03 | Security | Requester submits a ticket-create or comment body containing a different `requesterId`/`ownerId`/`authorId` | Value is ignored; authenticated identity used instead | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| API-11 | AC-04, BR-22 | Security | Requester session calls `GET/POST /api/staff/tickets/:id/notes` directly | 403; response body contains no note content or count | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| API-12 | AC-28 | Security | Requester requests or uploads an attachment to a ticket id they do not own | 404 (existence-hiding, per FR-07 policy), not 403 | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| API-13 | FR-07 | Security | Same failure reason (e.g. "not your ticket") triggered via three different endpoints | Identical status code every time, matching the FR-07 order | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| API-14 | AC-15 | API | Queue search by ticket number and by summary substring | Only matching tickets returned | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| API-15 | AC-22 | API | Queue filters: status, priority, owner (including literal "unassigned"), combined | AND semantics; correct narrowed subset | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| API-16 | AC-23 | API | Queue sort by created date and by priority; an invalid `sort` value | Correct ordering; invalid value falls back to documented default instead of erroring | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| API-17 | AC-15 | API | Queue pagination across 3+ pages | `page`/`pageSize`/`total` all correct and consistent | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| API-18 | AC-15 | API | Queue query that matches nothing | 200 with an empty array, not an error | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| API-19 | AC-07 | API | IT Staff claims an unassigned ticket | `ownerId` set to acting user; ticket no longer matches `owner=unassigned` | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-20 | BR-12 | API | A different (non-owning) active IT Staff reassigns an already-owned ticket | Reassignment succeeds; not limited to the current owner | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-21 | BR-11 | API | Attempt to set Ticket Owner to an inactive user or a Requester-role user | Rejected (400/409); owner unchanged | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-21b | FR-14 | API | IT Staff retrieves detail for a ticket that is unassigned or owned by a different IT Staff member | 200; full detail returned (queue is shared, no ownership restriction on read) | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-21c | FR-19 | API | Administrator session performs claim, IT Priority change, and status change on a ticket | Succeeds identically to an IT Staff session performing the same calls | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-22 | AC-08 | API | Status change not permitted from the ticket's current status (e.g. Closed → In Progress) | 409; `currentStatus` unchanged | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-23 | BR-19 | API | Status value outside the 8 valid statuses | 400 | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-24 | BR-14 | API | IT Staff changes IT Priority | `itPriority` updates; `requestedPriority` untouched | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-25 | AC-10 | API | Requester session attempts `PATCH .../status` directly | 403 | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-26 | AC-09 | API | Requester posts a Public Comment | Same author/content/timestamp visible via both the Requester and IT Staff ticket-detail endpoints | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| API-27 | AC-16 | API | Empty or whitespace-only Public Comment / Internal Note | 400; no row created | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| API-28 | AC-24 | API | Comment/Note content over 2,000 characters | 400; no row created | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| API-29 | BR-24 | API | Client-supplied `authorId`/`createdAt` fields on a comment/note POST body | Server overrides both from the session and the clock; client values ignored | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| API-29b | FR-18 | API | IT Staff posts a Public Comment and an Internal Note on the same ticket | Both created (201); the comment appears on the Requester's view, the note does not | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| API-29c | FR-22 | API | Attempt `PATCH`/`DELETE` on an existing comment or note id | 404/405 — no such route exists; append-only is enforced by the absence of the endpoint, not just by convention | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| API-30 | FR-11 | API | Requester sets "problem appears resolved" | Flag true; `currentStatus` unchanged; visible on the IT Staff detail endpoint | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| API-31 | AC-18 | API | Admin searches users by partial name and by partial email, case-insensitively | Only matches returned | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-32 | AC-19 | API | Admin filters users by role | Only that role returned | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-33 | AC-13 | API | Create a user with an email that already exists (case-insensitive match) | 409; no duplicate row created | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-33b | FR-25 | API | Create a user with valid name, email, one role, active state, and an initial password | 201; new user has `mustChangePassword = true` | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-34 | AC-21 | API | Create/edit a user with a role value outside the 3 permitted roles | 400 | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-35 | AC-20 | API | Edit a user's name, email, role, and active state | Change persisted; that user's next `/api/auth/me` reflects the new role | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-36 | AC-14 | API | Admin resets a user's password | `mustChangePassword = true`; next login forces the change flow | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-37 | AC-11 | API | Admin attempts to deactivate their own account | 409; account remains active | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-38 | AC-12 | API | Attempt to deactivate or change the role of the sole remaining active Administrator | 409; user unchanged | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-38b | BR-29 | API | Deactivate a user, then query the admin user list; separately attempt `DELETE /api/admin/users/:id` | Deactivated user still appears in the list with `isActive = false`; no delete route exists (404/405) | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-39 | AC-25, AC-26 | Security | Requester and IT Staff sessions each call `/api/admin/users` | 403 for both (cross-reference of API-08/09 from the admin side) | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| MIG-01 | AC-17, BR-31 | Migration/Regression | Run the Lab 3 migration against a database seeded the Lab 2 way | Pre-existing tickets keep correct `requesterId` after `RequesterUser` → `User`; row counts match before/after | `server/tests/lab-03/migration.regression.test.ts` | Planned |
| MIG-02 | BR-32 | Migration/Regression | Static check that no reachable route/import still uses `RequesterContext` or `SelectRequesterPage` | No matches found in `client/src` outside of removed/deleted files | `server/tests/lab-03/migration.regression.test.ts` | Planned |
| MIG-03 | FR-09 | Regression | Re-run the adapted Lab 2 Requester suite (`tickets.create`, `attachments`, `my-tickets`, `ticket-detail`) against an authenticated session instead of the removed selector | All previously-passing Lab 2 assertions still pass | `server/tests/lab-02/*.test.ts` (adapted in place) | Planned |
| UI-01 | AC-01, AC-05 | UI Component | Login form: client validation, busy spinner, invalid-credentials banner, inactive-account banner (same copy as invalid-credentials) | Correct state per case; no crash on repeated submit | `client/tests/lab-03/Login.test.tsx` | Planned |
| UI-02 | AC-02 | UI Component | Change Password screen: live policy checklist, mismatched confirmation blocked, success continues into the app | Continue disabled until all rules pass and confirmation matches | `client/tests/lab-03/ChangePassword.test.tsx` | Planned |
| UI-03 | AC-15, AC-22, AC-23 | UI Component | Staff Ticket Queue: search/filter/sort controls, loading, empty, no-results, pagination controls | Each state renders distinctly; controls re-fetch with correct query params | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Planned |
| UI-04 | AC-07, AC-08, AC-09 | UI Component | Staff Ticket Detail: claim/reassign control, IT Priority select, status select limited to BR-18 transitions from current status, Public Comment vs. Internal Note panels visually distinct | Status dropdown never offers a non-permitted transition; note panel has a clearly different style/label from comments | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Pass |
| UI-05 | AC-13, AC-18, AC-19, AC-20, AC-21 | UI Component | User Management: search, role filter, create/edit panel validation, inline duplicate-email error, deactivate blocked with a toast for self/last-admin cases | Each blocked action shows a clear, non-crashing message | `client/tests/lab-03/UserManagement.test.tsx` | Pass |
| UI-06 | (§7 UI Style) | UI Style | Zen Green tokens extended: role badge, all 8 status badges, Requested-vs-IT-Priority badge pairing, Public Comment vs. Internal Note styling | Correct color tokens per value; no unstyled/default-Bootstrap fallback visible | `client/tests/lab-03/ZenGreenStyleLab3.test.tsx` | Planned |
| UI-07 | FR-08 | UI Component | App shell/Navbar renders nav items for each of the 3 roles in turn | Requester sees only My Tickets/Create Ticket; IT Staff sees only My Queue; Administrator sees only Admin; no role ever sees another role's destinations, even via direct link render | `client/tests/lab-03/Navbar.test.tsx` | Planned |
| UI-08 | §8.6, FR-12 | UI Component | Requester Ticket Detail renders distinct messages for 403 (viewing a non-owned ticket, if reached), 404 (deleted/unknown ticket id), and safe generic 5xx | Each state shows a distinct, non-crashing message; no raw error/stack text rendered; Internal Notes tab never renders for this role | `client/tests/lab-03/RequesterTicketDetail.lab3.test.tsx` | Planned |
| UI-09 | §8.6 | UI Component | Staff Ticket Queue renders distinct messages for forbidden (403, e.g. session expired mid-session), safe generic 5xx, and the queue's own empty/no-results states (already in UI-03) | Each state shows a distinct, non-crashing message | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Planned |
| UI-10 | §8.6, AC-08 | UI Component | Staff Ticket Detail renders distinct messages for 404 (ticket id no longer exists), 409 (status change rejected as a non-permitted transition), and safe generic 5xx | Each state shows a distinct, non-crashing message; a 409 on status change reverts the dropdown to the last known valid status rather than showing the rejected value as if it succeeded | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Pass |
| UI-11 | §8.6, AC-11, AC-12, AC-13 | UI Component | User Management renders distinct messages for 403 (should never be reached by non-admins, tested as a guard), 404 (editing a user id that no longer exists), 409 (duplicate email, self-deactivation, last-admin block — three separate cases), and safe generic 5xx | Each of the 6 cases shows a distinct, non-crashing message; the 409 cases specifically show *why* (which rule blocked it), not just a generic failure | `client/tests/lab-03/UserManagement.test.tsx` | Pass |
| RESP-01 | (§8.7, handout Part 9) | Responsive | Screenshot Login, Staff Queue, Staff Ticket Detail, and User Management at desktop/tablet/mobile widths | No horizontal overflow, clipping, or overlapping controls at any width | `e2e/lab-03/responsive-screenshots.spec.ts` | Planned |
| E2E-01 | AC-01, AC-02 | E2E | Full login-with-initial-password → forced change → role-correct shell flow | App shell shows correct name/role only after the change succeeds | `e2e/lab-03/authentication.spec.ts` | Planned |
| E2E-02 | AC-06 | E2E | Logout, then attempt direct navigation to a protected route via URL | Redirected to login; no protected data is ever rendered | `e2e/lab-03/authentication.spec.ts` | Planned |
| E2E-03 | AC-07, AC-09 | E2E | IT Staff claims a ticket, posts a Public Comment and an Internal Note, changes status | Queue reflects new owner/status; the Requester later sees the Public Comment but never the Internal Note | `e2e/lab-03/staff-ticket-flow.spec.ts` | Planned |
| E2E-04 | AC-13, AC-14, AC-18 | E2E | Admin searches users, creates one, triggers a duplicate-email error, resets a password | Inline error then success; the password-reset user is forced through Change Password on next login | `e2e/lab-03/user-administration.spec.ts` | Pass |
| E2E-05 | AC-11, AC-12 | E2E | Admin attempts self-deactivation and attempts to deactivate the last remaining Administrator | Both attempts blocked with a visible conflict message; account states unchanged | `e2e/lab-03/user-administration.spec.ts` | Pass |

## 3. Acceptance-Criterion Traceability

| AC ID | Description (short) | Covered By |
|---|---|---|
| AC-01 | Valid login establishes authenticated session | API-01, UI-01, E2E-01 |
| AC-02 | Mandatory password change blocks the app until satisfied | API-03, API-04, UI-02, E2E-01 |
| AC-03 | Client-supplied requesterId/ownerId ignored in favor of session identity | API-10 |
| AC-04 | Requester blocked from Internal Notes endpoint, no leakage | API-11 |
| AC-05 | Invalid credentials and inactive account return identical generic error | API-02, UI-01 |
| AC-06 | Logout invalidates the session server-side | API-06, E2E-02 |
| AC-07 | Claiming an unassigned ticket sets ownership correctly | API-19, UI-04, E2E-03 |
| AC-08 | Non-permitted status transition rejected, status unchanged | API-22 |
| AC-09 | Public Comment visible to both Requester and IT Staff views | API-26, E2E-03 |
| AC-10 | Requester cannot set status directly | API-25 |
| AC-11 | Admin cannot deactivate own account | API-37, UI-05, E2E-05 |
| AC-12 | Last active Administrator cannot be deactivated/reassigned | API-38, E2E-05 |
| AC-13 | Duplicate email rejected on user create | API-33, UI-05, E2E-04 |
| AC-14 | Password reset forces change at next login | API-36, E2E-04 |
| AC-15 | Queue search + pagination correctness | API-14, API-17, API-18, UI-03 |
| AC-16 | Empty/whitespace comment or note rejected | API-27 |
| AC-17 | Migrated Requester's tickets remain correctly retrievable | MIG-01 |
| AC-18 | Admin user search by name/email | API-31, UI-05, E2E-04 |
| AC-19 | Admin role filter on user list | API-32 |
| AC-20 | Admin edits a user's role/basic info | API-35 |
| AC-21 | Invalid role value rejected | API-34 |
| AC-22 | Queue filters (status/priority/owner, combined) | API-15, UI-03 |
| AC-23 | Queue sort + invalid-sort fallback | API-16, UI-03 |
| AC-24 | Comment/Note 2,000-character limit enforced | API-28 |
| AC-25 | Requester blocked from staff and admin routes | API-08 |
| AC-26 | IT Staff blocked from admin routes | API-09 |
| AC-27 | Deactivated user's live session is rejected on next request | API-07 |
| AC-28 | Forged/foreign ticket id on attachment upload returns 404, not 403 | API-12 |

Every row above has at least one test; several ACs are covered at more than one level (API + UI and/or
E2E) deliberately, since a passing UI test alone does not prove the backend enforces the rule server-side.

## 4. UI Error-State Coverage Matrix

Handout §8.6 requires "clear feedback for meaningful processing, validation, success, empty/no-results,
forbidden, not-found, conflict, and safe API-failure conditions" per screen. This matrix makes that
requirement checkable screen-by-screen instead of leaving it implicit inside the component tests above.
✅ = a specific assertion for that state exists in the listed test; — = state is not reachable for that
screen and is intentionally not tested (noted why).

| Screen | 403 Forbidden | 404 Not Found | 409 Conflict | 5xx Safe Failure | Covered By |
|---|---|---|---|---|---|
| Login | — (pre-auth; N/A) | — (N/A) | — (N/A) | ✅ generic failure banner | UI-01 |
| Change Password | — (N/A, already authenticated) | — (N/A) | ✅ reused-temporary-password (BR-05) rendered as inline validation, not a raw 409 | ✅ | UI-02 |
| App Shell / Navbar | ✅ (role-filtered rendering, FR-08) | — (N/A) | — (N/A) | — (N/A) | UI-07 |
| Requester Ticket Detail | ✅ | ✅ | — (Requester has no conflict-producing actions besides the resolved-flag, which cannot conflict) | ✅ | UI-08 |
| Staff Ticket Queue | ✅ | — (list endpoint, not a single-resource lookup) | — (N/A) | ✅ | UI-09 |
| Staff Ticket Detail | ✅ (implicit via role guard, not re-tested here — see UI-04) | ✅ | ✅ (invalid status transition, BR-19) | ✅ | UI-04, UI-10 |
| User Management | ✅ | ✅ | ✅ (duplicate email, self-deactivation, last-admin — 3 distinct 409 causes) | ✅ | UI-05, UI-11 |

Any cell marked "—" is a deliberate scope decision (the state is unreachable for that screen), not a gap;
if implementation later proves a "—" cell reachable after all, this matrix must be updated and a test
added before the affected AC can be marked Pass.

## 5. FR/BR Traceability

Every Functional Requirement and Business Rule in `specification.md` maps to at least one test below.
Rules explicitly deferred by the handout (BR-20, Actions Taken) are marked N/A rather than left blank.

| FR/BR ID | Short Description | Covered By |
|---|---|---|
| FR-01 | Generic error on invalid credentials | API-01, API-02 |
| FR-02 | Inactive account uses the same generic error | API-02 |
| FR-03 | Session cookie issued on login, invalidated on logout | API-01, API-06 |
| FR-04 | `GET /api/auth/me` returns identity or 401 | API-01 |
| FR-05 | `mustChangePassword` blocks non-auth endpoints | API-03 |
| FR-06 | User changes own password | API-04, API-05 |
| FR-07 | Single ordered status-code policy (401/403/404/409/400) | API-13 (cross-checked by every test in `authorization.api.test.ts`) |
| FR-08 | Role-filtered navigation (UX only, not security) | UI-07 |
| FR-09 | Lab 2 Requester functions continue via session identity | MIG-03 |
| FR-10 | Requester posts Public Comment | API-26 |
| FR-11 | Requester marks "problem appears resolved" | API-30 |
| FR-12 | Requester blocked from Internal Notes and direct status change | API-11, API-25 |
| FR-13 | Ticket Queue search/filter/sort/pagination | API-14, API-15, API-16, API-17, API-18 |
| FR-14 | IT Staff retrieves any ticket's detail (no ownership restriction) | API-21b |
| FR-15 | Claim/reassign Ticket Owner | API-19, API-20 |
| FR-16 | Set IT Priority independent of Requested Priority | API-24 |
| FR-17 | Status transitions along the permitted matrix | API-22, UNIT-02 |
| FR-18 | IT Staff posts Public Comments and Internal Notes | API-29b |
| FR-19 | Administrator has the same Ticket operate permissions as IT Staff | API-21c |
| FR-20 | Public Comments visible to Requester, IT Staff, Administrator | API-26 |
| FR-21 | Internal Notes never returned to a Requester | API-11 |
| FR-22 | Comments/Notes are append-only | API-29c |
| FR-23 | Empty/whitespace content rejected | API-27 |
| FR-24 | Admin user list search + role filter | API-31, API-32 |
| FR-25 | Admin creates a user with an initial password | API-33b |
| FR-26 | Admin edits name/email/role/active state | API-35 |
| FR-27 | Admin sets a new initial password | API-36 |
| FR-28 | Duplicate email rejected | API-33 |
| FR-29 | Admin cannot deactivate own account | API-37 |
| FR-30 | Last active Administrator protected | API-38 |
| BR-01 | Only active user with valid credentials authenticates | API-01, API-02 |
| BR-02 | `mustChangePassword` blocks the app until satisfied | API-03 |
| BR-03 | Passwords stored only as a bcrypt hash | UNIT-03 |
| BR-04 | Password policy (length, case, digit, special char) | UNIT-01 |
| BR-05 | New password must differ from the temporary one | API-05 |
| BR-06 | Logout invalidates the session server-side | API-06 |
| BR-07 | No login-attempt lockout | API-07b |
| BR-08 | Authenticated identity determines ownership, not client input | API-10 |
| BR-09 | Requester may only view/modify owned tickets/attachments | API-12 |
| BR-10 | One Requester, at most one Ticket Owner per ticket | MIG-01 (schema-level, verified via migrated data) |
| BR-11 | Ticket Owner must be active IT Staff/Administrator | API-21 |
| BR-12 | Reassignment not limited to the current owner | API-20 |
| BR-13 | Requested Priority immutable after creation | API-24 |
| BR-14 | IT Priority changeable only by IT Staff/Administrator | API-24 |
| BR-15 | The 8 permitted statuses | UNIT-02 |
| BR-16 | New ticket always starts as New | MIG-03 (Lab 2 create behavior re-verified) |
| BR-17 | Only IT Staff/Administrator may change status | API-25 |
| BR-18 | Exact permitted-transition matrix | UNIT-02, API-22 |
| BR-19 | Invalid transition → 409; malformed value → 400 | API-22, API-23 |
| BR-20 | Actions Taken does not block resolution (Lab 3) | N/A — feature deferred to Lab 4, nothing to test yet |
| BR-21 | Public Comments visible to Requester/Staff/Admin | API-26 |
| BR-22 | Internal Notes restricted, no leakage on direct request | API-11 |
| BR-23 | 2,000-char limit; empty rejected; escaped rendering | API-27, API-28 |
| BR-24 | Author/timestamp are server-derived, not client-supplied | API-29 |
| BR-25 | Case-insensitive unique email | API-33 |
| BR-26 | Exactly one role per user | API-34 |
| BR-27 | Admin cannot deactivate self | API-37 |
| BR-28 | At least one active Administrator at all times | API-38 |
| BR-29 | Deactivation used instead of deletion | API-38b |
| BR-30 | Password reset forces change at next login | API-36 |
| BR-31 | Migrated tickets retain correct ownership | MIG-01 |
| BR-32 | Dev Requester selector fully removed | MIG-02 |
