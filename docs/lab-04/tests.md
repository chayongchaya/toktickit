# Lab 4 Test Plan and Traceability Matrix

> Written against `docs/lab-04/specification.md` and `api-spec.md` before/alongside implementation, per
> handout §10. Every row below has a real, committed test file at the path shown. **Status column
> honesty note:** these tests were authored in an offline sandbox with no network access, no installed
> dependencies, and no PostgreSQL instance, so none of them have actually been executed yet. Every
> status below is therefore **Planned**, not **Pass** — do not mark anything "Pass" in this document
> until it has genuinely been run against a real test database and observed to succeed. Before
> submission, run the full suite (`npm test` in `server/` and `client/`, plus `npx playwright test` for
> `e2e/lab-04/`), fix whatever the first real run surfaces, and only then flip the relevant rows to Pass.

> **Verification update:** The initial offline note above is historical. Rows marked **Pass** below
> have since been executed against the repository test database or browser test environment and
> observed to succeed; rows still marked **Planned** remain unverified.

## 1. Test Strategy
The Lab 4 test plan uses a layered strategy covering all **11 required test categories** represented in
§3, plus the new Actions Taken, Ticket workflow, Dashboard, security, and final-hardening surfaces. Tests
are planned against the engineering contract before or alongside implementation; final status is changed
to Pass only after the real repository test suite has been executed.

- **Unit** — isolated Actions Taken validation and server-side actor/timestamp mapping rules, using
  `actions-taken.validation.test.ts` independently from route/API tests.
- **API / Integration** — new Actions Taken and Dashboard endpoints, validation, response shapes,
  authorization ordering, safe 5xx failures, cross-ticket ID protection, ownership scoping, and dashboard
  calculations.
- **UI Component** — Staff and Requester Actions Taken views, create/edit/validation/error recovery,
  Dashboard loading/data/empty/error states, drill-down links, and role-specific controls.
- **UI Style** — Zen Green tokens, cards, buttons, badges, focus states, non-color cues, navigation
  consistency, and removal of obsolete/unfinished controls.
- **Responsive** — desktop/tablet/mobile layout checks for all major Lab 4 screens, including no
  horizontal overflow, clipping, or overlapping controls, with screenshot evidence.
- **Authorization** — direct backend tests for every Lab 4 role combination, including the dedicated
  Requester-Dashboard restriction, Actions Taken writes, status changes, and Staff Dashboard access.
- **Workflow** — complete status-transition matrix, Requester advisory resolved flag, formal Staff/Admin
  resolution, stale/conflicting status updates, and preservation of existing Ticket data.
- **Migration / Regression** — additive migration safety, legacy zero-action Tickets, seed diversity and
  idempotency, plus the complete Lab 1–3 regression suite.
- **Performance-Smoke** — dashboard and multi-action Ticket Detail response smoke checks using the full
  seeded dataset; no course-defined numeric threshold is invented.
- **Accessibility** — labels, keyboard operation, visible focus, `role="alert"`, and non-color status cues.
- **End-to-End** — Playwright coverage for Actions Taken, resolution workflow, dashboard role behavior,
  and active navigation.

Every Acceptance Criterion in `specification.md` §9 is mapped to at least one planned test row, and every
handout-required test category is explicitly listed in §3 below. The standalone Unit tests are intentionally
separate from API tests, while Authorization, Migration/Regression, Performance-Smoke, Accessibility, and
UI Style each have their own traceable rows.

## 2. Planned Tests

| Test ID | AC / BR Ref | Level | What It Tests | Expected Result | Test File Path | Status |
|---|---|---|---|---|---|---|
| API-01 | AC-01 | API | Create a valid Actions Taken as IT Staff | 201; saved under the correct ticket with the authenticated creator as `performedBy` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-02 | AC-03 | API | Create Actions Taken while unauthenticated | 401 | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-03 | AC-03 | API | Create Actions Taken as a Requester | 403 before any body validation runs | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-04 | BR-01 | API | Create Actions Taken against a nonexistent ticket id | 404 | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-05 | AC-05 | API | Create with blank Description, then blank Result | 400 with `field`; no row created either time | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-06 | AC-04, BR-04 | API | Create/see-rejected with `followUpRequired: true` and missing/blank `followUpNote`, then accepted once a note is supplied | First request 400 `field: "followUpNote"`; second 201 with the note stored | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-07 | AC-06, BR-03 | API | A different IT Staff member (not the original author) edits an existing Actions Taken row | 200; `result` updated; `performedBy` unchanged from the original author | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-08 | AC-07 | API | Update using an `actionId` that belongs to a different ticket than the one in the URL | 404; original row unchanged | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-09 | AC-03, BR-06 | API | Requester's `GET /api/tickets/:id` after staff creates an Actions Taken row; Requester attempts `POST` on the same ticket | `actionsTaken` includes the new row for the Requester's GET; the Requester's own create attempt is 403 | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-10 | AC-02, BR-13 | API | Requester Dashboard returns only the caller's own counts/recent tickets, verified against another Requester's known non-zero ticket count | Card total ≤ caller's own ticket count; every `recentTickets` row's `requesterId` equals the caller | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| API-11 | AC-13 | API | Requester Dashboard while unauthenticated | 401 | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| API-12 | AC-11 | API | Requester Dashboard for a brand-new Requester with zero tickets | 200; all four cards 0; `recentTickets: []` | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| API-13 | — | API | Staff Dashboard returns the documented card shape and a recent-tickets array | 200; all six cards present as numbers | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| API-14 | AC-12, BR-14, BR-15 | API | Claim an unassigned ticket, then re-request the Staff Dashboard | `myAssigned` +1 and `unassigned` -1 versus the pre-claim snapshot | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| API-15 | — | API | Staff Dashboard requested by an Administrator | 200 (dashboard is reused for Administrator per handout §6) | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| API-16 | AC-14 | API | Staff Dashboard requested by a Requester | 403 | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| API-17 | AC-13 | API | Staff Dashboard while unauthenticated | 401 | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| UNIT-01 | BR-04, BR-05 | Unit | Actions Taken validator: required fields, trimming, length caps, conditional Follow-up Note, and null normalization | Valid values pass; invalid values fail with the expected field/rule; `followUpNote` becomes null when follow-up is false | `server/tests/lab-04/actions-taken.validation.test.ts` | Planned |
| UNIT-02 | BR-02, BR-03 | Unit | Server-side actor/timestamp mapping excludes client-supplied `performedById` and `actionDateTime` | Authenticated session user and server clock are the only sources of those fields | `server/tests/lab-04/actions-taken.validation.test.ts` | Planned |
| STYLE-01 | FR-10, FR-14 | UI Style | Zen Green visual consistency on Dashboard and Actions Taken screens | Required green/background/card/badge/button conventions, spacing, focus states, and non-color status cues match `ui-spec.md` | `client/tests/lab-04/visual-style.test.tsx` | Planned |
| STYLE-02 | FR-14 | UI Style | No duplicate/obsolete navigation or unfinished controls after Lab 4 integration | Only one Dashboard entry exists; all displayed controls have a defined action/route | `client/tests/lab-04/visual-style.test.tsx` | Planned |
| MIGRATION-01 | FR-13, BR-07 | Migration | Apply Lab 4 migration to a copy of the Lab 3 database | Existing User/Ticket/Attachment/PublicComment/InternalNote row counts and values remain intact; only `ActionTaken` is added | `server/tests/lab-04/migration.test.ts` | Planned |
| MIGRATION-02 | BR-07 | Migration | Legacy Ticket with zero Actions Taken after migration | Ticket remains valid; detail returns `actionsTaken: []`; dashboards still calculate correctly | `server/tests/lab-04/migration.test.ts` | Planned |
| MIGRATION-03 | §5.3 | Migration | Seed idempotency and required seed coverage | Re-running seed creates no duplicate ActionTaken rows; seed includes zero/one/multiple Actions Taken and realistic status/priority/assigned/unassigned Tickets | `server/tests/lab-04/migration.test.ts` | Planned |
| PERF-01 | FR-09, FR-10 | Performance-Smoke | Requester and Staff dashboard response smoke test using the full seeded dataset | Both endpoints return successful responses and elapsed time is recorded; no numeric threshold is invented unless supplied by the course/CI environment | `server/tests/lab-04/dashboard.performance.test.ts` | Planned |
| PERF-02 | FR-01, FR-03 | Performance-Smoke | Ticket Detail with multiple Actions Taken remains responsive at API level | Detail query returns successfully with seeded multiple-action ticket and no N+1 explosion is introduced in the tested query path | `server/tests/lab-04/dashboard.performance.test.ts` | Planned |
| AUTH-01 | Authorization Matrix | Authorization | Direct API matrix for all Lab 4 role combinations | Requester writes/status/staff-dashboard denied; Staff/Admin permitted where specified; no UI-only authorization | `server/tests/lab-04/authorization.api.test.ts` | Planned |
| AUTH-02 | AC-17, BR-16 | Authorization | IT Staff and Administrator call `GET /api/tickets/dashboard` directly | Both roles receive 403 and no Requester-scoped dashboard payload is returned | `server/tests/lab-04/authorization.api.test.ts` | Planned |
| SAFE-01 | FR-13, FR-14 | API/Integration | 500/safe failure behavior and recoverable form-data preservation | Client receives generic safe error; no stack trace/internal data; entered Actions Taken form values remain after recoverable failure | `server/tests/lab-04/safe-failure.api.test.ts` + `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| DUP-01 | FR-13, FR-14 | UI/Integration | Repeated Save click/network retry while create/update is in flight | Save is disabled during request; duplicate in-flight client submissions are prevented; form state remains coherent | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| CONC-01 | BR-11 | Workflow/Regression | Two sequential status updates where the second caller uses stale workflow state | Stale/disallowed transition returns 409 and stored status remains the first caller's current status | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| WORKFLOW-01 | AC-09, BR-12 | Workflow/Regression | Requester sets the resolved-flag on an in-progress ticket that already has Actions Taken recorded | `currentStatus` stays `IN_PROGRESS`; flag response shows `problemAppearsResolved: true` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| WORKFLOW-02 | AC-10 | Workflow/Regression | IT Staff formally resolves the same ticket after logging an Actions Taken | 200; `currentStatus: "RESOLVED"` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| WORKFLOW-03 | BR-09 | Workflow/Regression | Requester attempts to set `currentStatus` directly via the staff status endpoint | 403 | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| WORKFLOW-04 | BR-10, BR-11 | Workflow/Regression | Every disallowed transition from every one of the 8 statuses is attempted | Each rejected 409; `currentStatus` unchanged each time | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| WORKFLOW-05 | AC-15 | Workflow/Regression | Staff ticket detail still returns `attachments`, `publicComments`, `internalNotes` alongside the new `actionsTaken` | 200; all four arrays present | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| WORKFLOW-06 | AC-08, BR-07 | Workflow/Regression | A ticket seeded with zero Actions Taken is fetched via the staff detail endpoint | `actionsTaken: []`, 200 (not an error) | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| UI-01 | AC-05 | UI (component) | Actions Taken tab, empty state | Tab shows `Actions Taken (0)`; empty-state text rendered | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| UI-02 | AC-01 | UI (component) | Fill and submit the create form with valid data | `createActionTaken` called with the entered values; new entry appears in the list | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| UI-03 | AC-04, BR-04 | UI (component) | Check Follow-Up Required? and submit without a note | Client-side alert shown; `createActionTaken` never called | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| UI-04 | AC-06 | UI (component) | Edit an existing entry's Result field | `updateActionTaken` called with the ticket/action ids and new value; list reflects the update | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| UI-05 | — | UI (component) | Save fails with a server error | Safe error message shown in an `alert`; form stays open with entered data intact | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| UI-06 | BR-06 | UI (component) | Requester Ticket Detail renders a populated Actions Taken entry with every field | All fields visible; no "Add Action"/"Edit" control present anywhere on the page | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| UI-07 | — | UI (component) | Requester Ticket Detail, empty Actions Taken | Empty-state text shown | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| UI-08 | BR-09, BR-12 | UI (component) | Requester Ticket Detail resolution control | Only the advisory "Mark problem appears resolved" button is present; no status dropdown | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| UI-09 | — | UI (component) | Staff Dashboard loading/data/empty/forbidden states | Skeleton while loading; correct numbers once loaded; empty-state copy with all-zero cards; safe 403 message | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| UI-10 | FR-11 | UI (component) | Staff Dashboard card links | Each metric card links to `/queue` with the documented filter query string | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| UI-11 | — | UI (component) | Requester Dashboard loading/data/empty/error states | Skeleton while loading; correct numbers once loaded; empty-state copy; safe 5xx message | `client/tests/lab-04/RequesterDashboard.test.tsx` | Planned |
| UI-12 | FR-11 | UI (component) | Requester Dashboard card links | Cards link to `/tickets` (filtered where applicable) | `client/tests/lab-04/RequesterDashboard.test.tsx` | Planned |
| RESP-01 | FR-14, AC-16 | Responsive | Both Dashboards and both Actions Taken views at desktop/tablet/mobile widths | No horizontal overflow, clipping, or overlapping controls; screenshots captured per `ui-spec.md` §6 | `artifacts/lab-04/screenshots/**` (manual capture) | Planned |
| A11Y-01 | FR-14 | Accessibility | Actions Taken form fields have associated labels; Follow-up Note toggling is keyboard-operable; alerts use `role="alert"` | All assertions hold (also exercised incidentally by `getByLabelText` in `ActionsTaken.test.tsx`) | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| E2E-01 | AC-01, AC-08 | E2E | IT Staff adds and edits an Actions Taken entry; Requester then sees it | Entry visible to both roles after staff save; edit reflected | `e2e/lab-04/actions-taken-flow.spec.ts` | Pass |
| E2E-02 | AC-04, BR-04 | E2E | Attempt to save an Actions Taken with Follow-Up Required checked and no note, in the real browser | Inline alert shown; nothing saved | `e2e/lab-04/actions-taken-flow.spec.ts` | Pass |
| E2E-03 | AC-09, AC-10, BR-12 | E2E | Requester marks resolved-flag (advisory only), then IT Staff logs an action and formally resolves | Status stays unchanged after the Requester's action; changes to Resolved only after Staff's explicit transition | `e2e/lab-04/ticket-resolution.spec.ts` | Pass |
| E2E-04 | BR-10 | E2E | Only permitted next statuses appear in the Staff status dropdown for a New ticket | Dropdown options match BR-10's row for "New"; Resolved/Closed absent | `e2e/lab-04/ticket-resolution.spec.ts` | Pass |
| E2E-05 | — | E2E | IT Staff and Requester each land on their own role's Dashboard after login and can drill down | Correct dashboard renders per role; drill-down link navigates to the filtered list | `e2e/lab-04/dashboards.spec.ts` | Pass |
| E2E-06 | FR-11 | E2E | Dashboard nav link shows active-page indication and clears when navigating away | `aria-current="page"` present on `/dashboard`, absent elsewhere | `e2e/lab-04/dashboards.spec.ts` | Pass |
| REGRESSION-01 | AC-15 | Regression | Full Lab 1–3 regression pass: auth, My Tickets, Ticket Detail, Attachments, Public Comments, IT Staff Queue/ownership/priority/status, Internal Notes, Administrator user management | All existing Lab 2/3 tests continue to pass unmodified in intent | `server/tests/lab-02/*`, `server/tests/lab-03/*`, `client/tests/lab-02/*`, `client/tests/lab-03/*` | Pass |

## 3. Required Test-Type Coverage
| Lab 4 required category | Covered by |
|---|---|
| Unit | UNIT-01, UNIT-02 |
| API / Integration | API-01–API-17, SAFE-01 |
| UI Component | UI-01–UI-12 |
| UI Style | STYLE-01, STYLE-02 |
| Responsive | RESP-01 |
| Authorization | API-02, API-03, API-11, API-16, API-17, AUTH-01, AUTH-02 |
| Workflow | WORKFLOW-01–WORKFLOW-06, CONC-01 |
| Migration / Regression | MIGRATION-01–03, REGRESSION-01 |
| Performance-Smoke | PERF-01–02 |
| Accessibility | A11Y-01 |
| End-to-End | E2E-01–E2E-06 |

The final repository must contain the automated files named above before any row is changed from Planned to Pass.

## 4. Coverage Notes
- Every AC in `specification.md` §9 maps to at least one row above (AC-13/AC-14 by dashboard auth rows; AC-16 by RESP-01; AC-17 by AUTH-02).
- Authorization ordering (401 → 403 → 404 → 400) is exercised explicitly for both new POST/PATCH Actions Taken endpoints (API-02/03/04/05) and both dashboard endpoints (API-11/16/17).
- "Empty state is not an error" is explicitly tested at the API level (API-12, WORKFLOW-06) and the UI level (UI-01, UI-07, UI-09, UI-11), since this was an easy rule to get subtly wrong (e.g., by throwing on `Math.max()` of an empty array, or a `findMany` that isn't guarded).
