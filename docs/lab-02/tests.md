# Lab 2 Test Plan and Traceability Matrix

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
| **UI-01** | AC-02, AC-07, AC-08, AC-09 | UI Component | Development Requester selector: loading, populated, empty, and error states | Loading indicator while pending; dropdown lists active users with Continue button; explicit empty-state message when no requesters returned; error banner with retry on fetch failure | `client/tests/lab-02/RequesterSelect.test.tsx` | Pass |
| **UI-02** | AC-01 | UI Component | Create Ticket form inline validation | Inline error appears under empty required inputs | `client/tests/lab-02/CreateTicket.test.tsx` | Pass |
| **UI-03** | AC-06 | UI Component | My Tickets table pagination & search | Filter state triggers table updates; no "Ticket Owner" column is rendered | `client/tests/lab-02/MyTickets.test.tsx` | Pass |
| **UI-04** | AC-05 | UI Component | Attachment soft-remove modal confirmation | Reason required before confirming soft removal | `client/tests/lab-02/AttachmentSection.test.tsx` | Pass |
| **UI-05** | AC-12 | UI Component | Ticket Detail attachment list rendering | Attachment row shows the original uploaded file name, not a generated/random name | `client/tests/lab-02/RequesterTicketDetail.test.tsx` | Pass |
| **E2E-01** | AC-01, AC-06 | E2E | Full requester ticket creation to listing lifecycle | Form submitted -> appears in My Tickets table | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pass |

---

## 2. Acceptance Criteria Traceability Matrix

| Acceptance Criteria ID | Description | Covered By Tests |
| --- | --- | --- |
| **AC-01** | Create ticket with valid data and system-generated number | `API-01`, `API-02`, `UI-02`, `E2E-01` |
| **AC-02** | Simulated login / Dev Requester context selection | `API-03`, `UI-01` |
| **AC-03** | Requester data isolation and unauthorized access prevention | `API-04` |
| **AC-04** | File attachment size and MIME type restrictions | `API-05` |
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
* [ ] **Badges**: Status and Priority badges conform to color tokens.
* [ ] **Form States**: Submitting button shows busy state and prevents duplicate clicks.
* [ ] **No out-of-scope columns**: My Tickets table does not render a "Ticket Owner" column.

---

## 4. Test Execution Commands

* **Backend Tests**: `npm run test:server`
* **Frontend Tests**: `npm run test:client`
* **E2E Tests**: `npx playwright test`

---

## 5. Known Limitations / Deferred Tests

* `UNIT-01`, `API-02b`, `API-03b`, `API-06b`, `API-08`, and `API-09` are newly planned to close backend edge-case gaps found during review and are tracked under `Status: To do`. They will be implemented and turned green in the upcoming backend-focused branch before Lab 2 is finalized.