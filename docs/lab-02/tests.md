# Lab 2 Test Plan and Traceability Matrix

> Revision note (client-component-test branch): every row below was re-verified against
> the actual test file it cites. Rows are marked **Pass** only when the assertions in
> that file genuinely exercise the described behavior (not just render the component).
> Backend-only items are out of scope for this branch and remain `To do` until the
> corresponding backend branch lands.

## 1. Planned Tests Table

| Test ID | AC Ref | Level | What It Tests | Expected Result | Test File Path | Status |
| --- | --- | --- | --- | --- | --- | --- |
| **UNIT-01** | AC-01, AC-10 | Unit | Ticket Number generator produces the `TKT-YYYY-XXXXXX` format and is collision-safe under concurrent calls | Two concurrent calls never return the same number | `server/tests/lab-02/ticket-number.unit.test.ts` | To do |
| **API-01** | AC-01 | API | Create ticket with valid data | Status 201; unique Ticket Number returned; status is `NEW` | `server/tests/lab-02/tickets.create.test.ts` | Pass |
| **API-02** | AC-01 | API | Create ticket missing summary | Status 400; field validation error returned | `server/tests/lab-02/tickets.create.test.ts` | Pass |
| **API-02b** | AC-01 | API | Create ticket with invalid `requestedPriority` / unknown or inactive `categoryId` / `relatedSystemId` | Status 400, not 500 | `server/tests/lab-02/tickets.create.test.ts` | To do |
| **API-03** | AC-02 | API | Fetch active requesters | Status 200; excludes inactive requesters | `server/tests/lab-02/requesters.api.test.ts` | Pass |
| **API-03b** | AC-02 | API | Fetch active categories / related systems | Status 200; excludes inactive rows for both endpoints | `server/tests/lab-02/reference-data.api.test.ts` | To do |
| **API-04** | AC-03 | API | Access ticket owned by another requester | Status 403 / 404; data is rejected | `server/tests/lab-02/ticket-detail.api.test.ts` | Pass |
| **API-05** | AC-04 | API | Upload attachment > 5 MB or invalid mime type | Status 400; upload rejected | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| **API-06** | AC-05 | API | Soft-remove attachment with valid reason | Status 200; `isRemoved = true`; download blocked | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| **API-06b** | AC-05, AC-12 | API | Upload then fetch attachment metadata | Response contains `originalFileName` matching the uploaded file's name, never the internal storage name | `server/tests/lab-02/attachments.api.test.ts` | To do |
| **API-07** | AC-06 | API | Filter My Tickets by category and search term | Status 200; returns matching tickets for requester only | `server/tests/lab-02/my-tickets.api.test.ts` | Pass |
| **API-08** | AC-11 | API | Create ticket / upload attachment using an inactive requester's id sent directly to the API | Status 403; write is rejected even though the id exists | `server/tests/lab-02/inactive-requester.api.test.ts` | To do |
| **API-09** | AC-10 | API | Fire N concurrent `POST /api/tickets` requests | All N tickets are created with N distinct Ticket Numbers | `server/tests/lab-02/tickets.create.test.ts` | To do |
| **UI-01** | AC-02, AC-07, AC-08, AC-09 | UI Component | Development Requester selector: loading, populated, empty, and error states | Loading indicator + disabled Continue while pending; dropdown lists active users with working Continue; explicit empty-state message with disabled Continue when no requesters returned; error banner on fetch failure | `client/tests/lab-02/RequesterSelect.test.tsx` | Pass |
| **UI-02** | AC-01 | UI Component | Create Ticket form validation, correction, busy state, success, and failure | Inline per-field error + `is-invalid` class on empty required inputs; error clears on correction; submit button shows spinner and is disabled while submitting; valid submit posts trimmed values and the requester id; failed submit shows an error banner and preserves field values | `client/tests/lab-02/CreateTicket.test.tsx` | Pass |
| **UI-03** | AC-03, AC-06 | UI Component | My Tickets request scoping, search, empty vs. no-results states, requester switching | Fetch sent with `x-requester-id` header; search filters rows instantly; distinct "no tickets at all" vs. "no matching tickets" messages; switching requester re-fetches and Requester A's tickets disappear; no "Ticket Owner" column rendered | `client/tests/lab-02/MyTickets.test.tsx` | Pass |
| **UI-04** | AC-04, AC-05 | UI Component | Attachment upload and soft-removal interactions | Valid upload posts `FormData` with `requesterId` and refreshes the list; invalid type/oversized/over-limit uploads are blocked client-side with a message and no API call; soft-remove is blocked until a reason is provided, then sent in the DELETE body; removed attachments never render a download link | `client/tests/lab-02/AttachmentSection.test.tsx` | Pass |
| **UI-05** | AC-01, AC-03, AC-12 | UI Component | Ticket Detail loading, read-only rendering, ownership-denied, and not-found states | Loading indicator shown before data arrives; read-only fields display fetched values; a 403 response renders a safe forbidden message (no crash, no stale fields); a 404 response renders a not-found message | `client/tests/lab-02/RequesterTicketDetail.test.tsx` | Pass |
| **UI-06** | — (section 8.8 UI Style Checking) | UI Style | Zen Green tokens and field-state classes | Required fields show the asterisk marker; `is-invalid` applied only to failing fields; busy submit button shows a spinner and is disabled; priority badges use the spec color tokens; read-only header fields use `bg-light` and the `readonly` attribute | `client/tests/lab-02/ZenGreenStyle.test.tsx` | Pass |
| **E2E-01** | AC-01, AC-06 | E2E | Full requester ticket creation to listing lifecycle | Form submitted -> appears in My Tickets table | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pass |

---

## 2. Acceptance Criteria Traceability Matrix

| Acceptance Criteria ID | Description | Covered By Tests |
| --- | --- | --- |
| **AC-01** | Create ticket with valid data and system-generated number | `API-01`, `API-02`, `UI-02`, `UI-05`, `E2E-01` |
| **AC-02** | Simulated login / Dev Requester context selection | `API-03`, `UI-01` |
| **AC-03** | Requester data isolation and unauthorized access prevention | `API-04`, `UI-03`, `UI-05` |
| **AC-04** | File attachment size and MIME type restrictions | `API-05`, `UI-04` |
| **AC-05** | Soft-removal of attachments with reason and blocked download | `API-06`, `UI-04` |
| **AC-06** | Search, filter, sorting, and pagination on My Tickets | `API-07`, `UI-03`, `E2E-01` |
| **AC-07** | Loading state shown while requesters are being fetched | `UI-01` |
| **AC-08** | Empty state shown when no active requesters exist | `UI-01` |
| **AC-09** | Safe failure state shown when the requesters fetch fails | `UI-01` |
| **AC-10** | Ticket Numbers remain unique under concurrent creation | `UNIT-01`, `API-09` |
| **AC-11** | Inactive requester cannot create tickets/attachments via direct API calls | `API-08` |
| **AC-12** | Original attachment file name is preserved and displayed, not the internal storage name | `API-06b`, `UI-05` |

---

## 3. Responsive & Visual Verification Checklist

* [ ] **Desktop (≥ 992px)**: Header, 2-column forms, data table render cleanly without overlap.
* [ ] **Tablet (768px – 991px)**: Form fields resize gracefully, tables maintain scannability.
* [ ] **Mobile (< 768px)**: Stacked inputs, table converts to card view, zero horizontal scrolling.
* [ ] **Badges**: Status and Priority badges conform to color tokens. *(Priority badge color
  tokens now have automated coverage — `UI-06` — but this is a component-level check only;
  it does not replace the Playwright screenshot pass at all three viewports, which is still
  deferred to a separate `responsive-visual-tests` branch.)*
* [x] **Form States**: Submitting button shows busy state and prevents duplicate clicks —
  covered by `UI-02` / `UI-06`.
* [x] **No out-of-scope columns**: My Tickets table does not render a "Ticket Owner" column —
  covered by `UI-03`.

---

## 4. Test Execution Commands

* **Backend Tests**: `npm run test:server`
* **Frontend Tests**: `npm run test:client`
* **E2E Tests**: `npx playwright test`

---

## 5. Known Limitations / Deferred Tests

* `UNIT-01`, `API-02b`, `API-03b`, `API-06b`, `API-08`, and `API-09` close backend edge-case
  gaps found during review and remain `Status: To do`. They belong to the ownership /
  backend branch and are out of scope here.
* Responsive and visual regression screenshots (Playwright, desktop/tablet/mobile) are not
  yet implemented anywhere in the repository. Tracked for a dedicated
  `responsive-visual-tests` branch — not part of `client-component-test`.
* `client/tests/lab-02/AttachmentSection.test.tsx` mocks `window.prompt` to drive the
  removal-reason flow. This is a known test-only workaround; the underlying UI still uses
  a native browser `prompt()`/`alert()` instead of a reusable Zen Green validation
  component (see specification.md section 3). Replacing that component is out of scope
  for this branch but is recommended before Lab 2 is finalized, since native dialogs are
  not stylable, not screenshot-able for Part 9 evidence, and not fully accessible.
