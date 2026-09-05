# TokTickIT UI & Responsive Specification (Zen Green Theme)

## 1. Visual Design & Theme Tokens
This specification defines the visual standards for Lab 2 following the Zen Green Theme.

| Token / Element | Color Code | Usage |
| :--- | :--- | :--- |
| **Primary Green** | `#006B3C` | App header bar, primary action buttons, strong emphasis |
| **Secondary Green** | `#0B7A46` | Active navigation tabs, links, hover states, focused borders |
| **Pale Green** | `#EAF6EF` | Selected rows, success callouts, subtle section highlights |
| **Page Background** | `#F5F7F6` | Neutral near-white background |
| **Surface / Card** | `#FFFFFF` | Form cards, tables, modal containers with subtle border `#E5E7EB` |
| **Text Primary** | `#1C2A22` | Dark charcoal-green for comfortable reading |
| **Text Muted** | `#6B7280` | Subtitles, timestamps, helper descriptions |
| **Error State** | `#DC2626` | Text, borders, and error badges; dark red |
| **Warning State** | `#D97706` | Amber badges and callouts |
| **Success State** | `#16A34A` | Green confirmation indicators |

---

## 2. Typography & Spacing

| Element | Font Family | Size | Weight | Line Height |
| :--- | :--- | :--- | :--- | :--- |
| **App Title / Header** | System UI (`-apple-system, Segoe UI, Roboto, sans-serif`) | 20px | 600 (Semibold) | 1.3 |
| **Section Heading** | System UI | 16px | 600 (Semibold) | 1.4 |
| **Body / Field Text** | System UI | 14px | 400 (Regular) | 1.5 |
| **Field Label** | System UI | 13px | 500 (Medium) | 1.4 |
| **Helper / Validation Text** | System UI | 12px | 400 (Regular) | 1.4 |
| **Button Label** | System UI | 14px | 600 (Semibold) | 1.2 |

**Spacing scale**: an 8px base unit is used throughout (8 / 16 / 24 / 32px) for padding,
gaps between form rows, and card margins. Form field groups use 16px vertical spacing;
sections within a card use 24px vertical spacing; page-level sections use 32px.

---

## 3. Component Design & Behavior

### 3.1 Inputs & Form Controls
- **Editable Fields**: White background (`#FFFFFF`), neutral border (`#D1D5DB`), focused border (`#0B7A46`) with subtle outline.
- **Read-Only Fields**: Shaded background (`#F0F4F1`) with crisp text, distinctly non-editable.
- **Invalid Fields**: Border changes to Error State (`#DC2626`), background stays white, and the field carries the `is-invalid` class referenced in `tests.md` (UI-02, UI-06). A validation message renders directly beneath the field in the same red (`#DC2626`); the border color alone is never the only signal (see Accessibility, section 6).
- **Disabled Fields**: Muted background (`#F0F4F1`), muted text (`#6B7280`), cursor `not-allowed`.
- **Focused Fields**: `#0B7A46` border with a 2px outline ring at 20% opacity, visible via keyboard `:focus-visible` as well as mouse focus.
- **Field Labels**: Positioned directly above inputs with a red asterisk (`*`) indicating mandatory fields.
- **Validation Messages**: Displayed immediately beneath the corresponding field in red text (`#DC2626`).
- **Textarea**: Dedicated multiline height for Description (min-height: 120px).

### 3.2 Button Hierarchy
- **Primary Action**: Solid `#006B3C` background with white text (e.g., *Submit Ticket*, *Continue*).
- **Secondary Action**: White background with `#006B3C` border and text (e.g., *Cancel*, *Back to My Tickets*).
- **Destructive Action**: `#DC2626` outline or solid for deleting/removing attachments.
- **Disabled / Busy State**: Muted opacity (50%), cursor `not-allowed`, and a loading spinner indicator while processing.

### 3.3 Status and Priority Badges
- **Status Badges**:
  - `New`: Pale Green (`#EAF6EF` text `#006B3C`).
  - `In Progress`: Soft Blue/Indigo (`#EEF2FF` text `#4F46E5`).
  - `Resolved`: Soft Teal (`#ECFDF5` text `#059669`).
- **Priority Badges**:
  - `Low`: Pale Green/Gray (`#F3F4F6` text `#4B5563`).
  - `Medium`: Amber (`#FEF3C7` text `#D97706`).
  - `High`: Pale Red (`#FEE2E2` text `#DC2626`).

### 3.4 Form State Enumeration (Create Ticket)
The Create Ticket form moves through six distinct states, each with a defined visual treatment:

| State | Trigger | Visual Treatment |
| :--- | :--- | :--- |
| **Initial** | Form first mounted | All fields empty/default; Submit enabled; no validation messages shown. |
| **Loading** | Reference data (categories, related systems) being fetched | Dropdowns show a disabled skeleton/placeholder state; Submit disabled until reference data resolves. |
| **Validation** | User leaves a field or attempts submit with invalid data | Failing fields get `is-invalid` border + inline message per field (section 3.1); focus moves to the first invalid field. |
| **Submitting** | Valid submit in flight | Submit button shows a spinner, is disabled, and label changes to "Submitting…"; all inputs disabled to prevent double-submit. |
| **Success** | API returns 201 | Brief success confirmation, then navigation to My Tickets / Ticket Detail for the new ticket. |
| **Failure** | API returns a non-2xx response | An error banner appears above the form; all previously entered field values are preserved; Submit re-enabled. |

---

## 4. Screen Specifications

### 4.1 Application Shell & Navigation
- **Header bar**: Fixed top bar, Primary Green (`#006B3C`) background, white text/logo on the left, Development Requester name and a *Switch Requester* action on the right.
- **Navigation**: A simple two-item nav (My Tickets, Create Ticket) rendered as tabs directly under the header on Desktop/Tablet, and collapsed into the header on Mobile (see section 5).
- **Active state**: The active nav item is underlined and colored Secondary Green (`#0B7A46`); inactive items use Text Muted (`#6B7280`).
- **Content area**: Sits on the Page Background (`#F5F7F6`) below the shell, with a max content width on Desktop and full-bleed on Mobile.

### 4.2 Development Requester Selection Screen
- Centered card layout on `#F5F7F6` background.
- Prominent info banner stating this is a simulated testing context for Lab 2.
- Requester dropdown populated only with active requesters.
- Action button: *Continue*.

### 4.3 Create Ticket Screen
- **Header**: Read-only Ticket Number ("Assigned upon creation") and Requester Name autofilled from context.
- **Form Section**:
  - Row 1: Category dropdown and Related System dropdown.
  - Row 2: Requested Priority dropdown.
  - Row 3: Ticket Summary input field.
  - Row 4: Description textarea.
- **Attachment Section**:
  - File picker accepting `.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf`
    (maximum 5 MB per file and 5 active files per ticket).
  - Real-time client validation for rejected files: an inline message in Error State
    (`#DC2626`) appears directly beneath the file picker naming the specific reason
    (wrong type / too large / limit reached), and the offending file is not added to
    the pending list.
- **Footer**: *Cancel* and *Submit Ticket* buttons.

### 4.4 My Tickets Screen
- **Filter Bar**: Search bar (number/summary), Category filter, Priority filter, Status filter, and *Clear Filters* button.
- **Data Table (Desktop)**: Columns: Ticket No., Created Date, Summary, Category, Requested Priority, IT Priority, Current Status, Last Updated.
- **Pagination**: Includes a page-size selector with options **5, 8, 10, and 20** tickets per page. Changing the page size resets the current page to page 1. The screen also displays the current page indicator and Previous/Next navigation.
- **Empty vs. No-Results States**: These are two distinct states with different messaging:
  - **Empty (no tickets at all)**: shown when the requester has zero tickets regardless of filters. Message: "You haven't created any tickets yet," with a *Create Ticket* call-to-action.
  - **No Results (filters applied)**: shown when the requester has tickets but the current search/filter combination matches none. Message: "No tickets match your filters," with a visible *Clear Filters* action. This state is only reachable when at least one filter or search term is active.

### 4.5 Requester Ticket Detail Screen
- Full read-only view of ticket metadata.
- **Attachment Tab**: attachments are shown in one of five states, each with distinct visual treatment:
  - **Active**: file name, size, and a *Download* button.
  - **Uploading**: a progress/spinner indicator in place of the Download button; the row is not yet interactive.
  - **Invalid** (rejected client-side before upload completes): row shown with Error State (`#DC2626`) text and the rejection reason, no Download button.
  - **Removed**: metadata and removal reason shown, `#6B7280` muted text, download/preview disabled.
  - **Unavailable** (file missing/failed on the server after being recorded): row shown with a Warning State (`#D97706`) badge reading "Unavailable" and no Download button.
  - *Add Attachment* button (disabled if 5 active files reached).
  - *Soft Remove* button opening a modal prompting for a mandatory removal reason.

---

## 5. Responsive Breakpoints

| Viewport | Screen Width | Required Layout Behavior |
| :--- | :--- | :--- |
| **Desktop** | ≥ 992px | Multi-column grid, full data table with horizontal alignment. |
| **Tablet** | 768px–991px | Two-column form layout, table with horizontal scroll or adjusted column widths. |
| **Mobile** | < 768px | Single-column stacked fields, table converted into card-based list, touch-friendly buttons. |

---

## 6. Accessibility

- **Labels**: Every input has a programmatically associated `<label>` (via `htmlFor`/`id`), not just placeholder text — placeholders never substitute for a label.
- **Keyboard focus**: All interactive elements (inputs, dropdowns, buttons, links) are reachable via Tab in a logical order matching visual layout, with a visible `:focus-visible` outline (2px, Secondary Green at 20% opacity) distinct from the default browser outline.
- **Non-color indicators**: Every state that uses color also carries a non-color cue:
  - Invalid fields: red border **and** an inline text message (not color alone).
  - Required fields: red asterisk **and** the word "required" in the field's accessible name.
  - Status/Priority badges: color **and** the status/priority word as visible text (never an icon-only or color-only badge).
  - Removed/Unavailable attachments: muted color/badge **and** explicit label text ("Removed", "Unavailable").
- **ARIA (implemented)**: Error banners use `role="alert"` (verified in `CreateTicketPage.tsx`,
  `TicketDetailPage.tsx`, and `TicketListPage.tsx`) so screen readers announce them immediately.
- **ARIA (deferred)**: `aria-busy="true"` on loading regions and `aria-disabled` reflecting the
  Submit button's busy state are **not yet present** in the client source, and no test currently
  asserts them (checked against all files in `client/src/pages/`). The Submit button's busy state
  is currently only conveyed via the native HTML `disabled` attribute plus a visible spinner —
  which covers sighted and keyboard users, but not the `aria-disabled`/`aria-busy` semantics
  described above. Add these attributes (and a corresponding test) before this bullet can be
  marked complete, or scope this bullet down to what is actually implemented.
- **Contrast**: All text/background combinations in section 1's token table meet WCAG AA contrast (4.5:1 for body text, 3:1 for large text/UI components).

---

## 7. Visual Inspection Checklist
- [x] Primary Green (`#006B3C`) and Pale Green (`#EAF6EF`) applied accurately.
- [x] Red asterisk (`*`) shown on all mandatory field labels.
- [x] Error messages positioned directly under inputs.
- [x] No horizontal layout breaking or overlapping on 375px mobile viewport.
- [x] Soft-removed attachments clearly disabled from downloading.

**Screenshot evidence** (captured by `e2e/lab-02/responsive-screenshots.spec.ts`):

| Screen | Desktop | Tablet | Mobile |
| :--- | :--- | :--- | :--- |
| Create Ticket | `artifacts/lab-02/screenshots/desktop-create-ticket.png` | `artifacts/lab-02/screenshots/tablet-create-ticket.png` | `artifacts/lab-02/screenshots/mobile-create-ticket.png` |
| My Tickets | `artifacts/lab-02/screenshots/desktop-my-tickets.png` | `artifacts/lab-02/screenshots/tablet-my-tickets.png` | `artifacts/lab-02/screenshots/mobile-my-tickets.png` |
| Ticket Detail | `artifacts/lab-02/screenshots/desktop-ticket-detail.png` | `artifacts/lab-02/screenshots/tablet-ticket-detail.png` | `artifacts/lab-02/screenshots/mobile-ticket-detail.png` |
