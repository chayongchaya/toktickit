# Lab 2 Test Plan and Traceability Matrix

## 1. Planned Tests Table

| Test ID | AC Ref | Level | What It Tests | Expected Result | Test File Path | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **API-01** | AC-01 | API | Create ticket with valid data | Status 201; unique Ticket Number returned; status is `NEW`[cite: 1] | `server/tests/lab-02/create-ticket.api.test.ts` | Pass[cite: 1] |
| **API-02** | AC-01 | API | Create ticket missing summary | Status 400; field validation error returned[cite: 1] | `server/tests/lab-02/create-ticket.api.test.ts` | Pass[cite: 1] |
| **API-03** | AC-02 | API | Fetch active requesters | Status 200; excludes inactive requesters[cite: 1] | `server/tests/lab-02/requesters.api.test.ts` | Pass[cite: 1] |
| **API-04** | AC-03 | API | Access ticket owned by another requester | Status 403 / 404; data is rejected[cite: 1] | `server/tests/lab-02/ticket-detail.api.test.ts` | Pass[cite: 1] |
| **API-05** | AC-04 | API | Upload attachment > 5 MB or invalid mime type | Status 400; upload rejected[cite: 1] | `server/tests/lab-02/attachments.api.test.ts` | Pass[cite: 1] |
| **API-06** | AC-05 | API | Soft-remove attachment with valid reason | Status 200; `isRemoved = true`; download blocked[cite: 1] | `server/tests/lab-02/attachments.api.test.ts` | Pass[cite: 1] |
| **API-07** | AC-06 | API | Filter My Tickets by category and search term | Status 200; returns matching tickets for requester only[cite: 1] | `server/tests/lab-02/my-tickets.api.test.ts` | Pass[cite: 1] |
| **UI-01** | AC-02 | UI Component | Development Requester selector rendering | Dropdown displays active users with continue button[cite: 1] | `client/src/tests/lab-02/RequesterSelect.test.tsx` | Pass[cite: 1] |
| **UI-02** | AC-01 | UI Component | Create Ticket form inline validation | Inline error appears under empty required inputs[cite: 1] | `client/src/tests/lab-02/CreateTicket.test.tsx` | Pass[cite: 1] |
| **UI-03** | AC-06 | UI Component | My Tickets table pagination & search | Filter state triggers table updates[cite: 1] | `client/src/tests/lab-02/MyTickets.test.tsx` | Pass[cite: 1] |
| **UI-04** | AC-05 | UI Component | Attachment soft-remove modal confirmation | Reason required before confirming soft removal[cite: 1] | `client/src/tests/lab-02/AttachmentSection.test.tsx` | Pass[cite: 1] |
| **E2E-01** | AC-01, AC-06 | E2E | Full requester ticket creation to listing lifecycle | Form submitted -> appears in My Tickets table[cite: 1] | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pass[cite: 1] |

---

## 2. Acceptance Criteria Traceability Matrix

| Acceptance Criteria ID | Description | Covered By Tests |
| :--- | :--- | :--- |
| **AC-01** | Create ticket with valid data and system-generated number[cite: 1] | `API-01`, `API-02`, `UI-02`, `E2E-01`[cite: 1] |
| **AC-02** | Simulated login / Dev Requester context selection[cite: 1] | `API-03`, `UI-01`[cite: 1] |
| **AC-03** | Requester data isolation and unauthorized access prevention[cite: 1] | `API-04`[cite: 1] |
| **AC-04** | File attachment size and MIME type restrictions[cite: 1] | `API-05`[cite: 1] |
| **AC-05** | Soft-removal of attachments with reason and blocked download[cite: 1] | `API-06`, `UI-04`[cite: 1] |
| **AC-06** | Search, filter, sorting, and pagination on My Tickets[cite: 1] | `API-07`, `UI-03`, `E2E-01`[cite: 1] |

---

## 3. Responsive & Visual Verification Checklist
- [ ] **Desktop (≥ 992px)**: Header, 2-column forms, data table render cleanly without overlap[cite: 1].
- [ ] **Tablet (768px – 991px)**: Form fields resize gracefully, tables maintain scannability[cite: 1].
- [ ] **Mobile (< 768px)**: Stacked inputs, table converts to card view, zero horizontal scrolling[cite: 1].
- [ ] **Badges**: Status and Priority badges conform to color tokens[cite: 1].
- [ ] **Form States**: Submitting button shows busy state and prevents duplicate clicks[cite: 1].

---

## 4. Test Execution Commands
- **Backend Tests**: `npm run test:server`
- **Frontend Tests**: `npm run test:client`
- **E2E Tests**: `npx playwright test`