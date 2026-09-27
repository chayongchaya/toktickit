# Lab 4 UI Specification — Zen Green (extends Lab 2/Lab 3)

> Extends `docs/lab-03/ui-spec.md`. Every pattern below reuses Lab 2/3's actual conventions: Bootstrap 5
> utility classes + inline hex for the Zen Green palette, plain emoji for icons, the existing card/badge/
> button/table/loading/empty/error conventions. No new visual language is introduced (handout §7).

## 0. Reused Conventions (unchanged)
- Cards: `card border-0 shadow-sm rounded-3 bg-white`.
- Primary green: `#006B3C` (buttons, active nav, count emphasis).
- Status badges: `rounded-pill px-2 py-1 fw-normal` with the existing per-status background/text/border
  triples from `docs/lab-03/ui-spec.md` §0, reused as-is on every dashboard's recent-ticket rows.
- Loading: skeleton `placeholder-glow` cards (matches the existing Queue/List loading pattern), not a spinner-only screen.
- Icons: 📊 Dashboard, kept consistent with the existing emoji set (no icon font introduced).

## 1. IT Staff / Administrator Dashboard (`/dashboard`, role IT Staff or Administrator)
Component: `client/src/pages/staff/StaffDashboardPage.tsx`.

**Layout**
- Header: "Welcome back, {name}!" + subtext + a "⟳ Refresh" button (re-fetches without a full page reload).
- 6 metric cards in a responsive grid (`col-6` on mobile, `col-lg-2` on desktop, so 2-per-row on phones and 6-per-row on desktop): New, Open, In Progress, Waiting for Requester, My Assigned, Unassigned. Each card is itself a `Link` to `/queue` with the matching filter query string (`?status=NEW`, `?owner=<id>`, `?owner=unassigned`, etc.) — an accessible drill-down, not a decorative number.
- "My Recent Tickets" panel (up to 5, owned-by-me, newest-updated-first) with a "View all" link to `/queue`; each row links to `/queue/:id` and shows the status badge + relative-looking timestamp.
- "Quick Actions" panel: "My Queue" always; "Manage Users" only for Administrator.

**States**
- *Loading*: 6 skeleton cards + "Loading recent tickets..." text in the list panel.
- *Empty (no owned tickets yet)*: "You have no assigned tickets yet." in the recent-tickets panel; metric cards still render with real (possibly 0) counts — the cards themselves are never hidden.
- *Forbidden*: unreachable in normal navigation (a Requester never sees this route render this component — see App.tsx role switch), but if the API ever returns 403 the page shows "You are not allowed to view this dashboard." in an `alert` and does not render stale/zero cards as if they were real.
- *Safe failure (5xx/network)*: "Unable to load the staff dashboard." in an `alert`; Refresh remains available to retry.

## 2. Requester Dashboard (`/dashboard`, role Requester)
Component: `client/src/pages/RequesterDashboardPage.tsx`.

**Layout**
- Header: "Welcome, {name}!" + subtext.
- 4 metric cards (`col-6` mobile, `col-lg-3` desktop): My Open Tickets, Waiting for Me, Resolved, Closed — each a `Link` to `/tickets` (filtered by status where applicable).
- "My Recent Tickets" panel (up to 5, newest-updated-first) with "View all" → `/tickets`; each row links to `/tickets/:id`.
- "Quick Actions" panel: "Create Ticket" (→ `/tickets/new`) and "View My Tickets" (→ `/tickets`).
- Deliberately does **not** duplicate the full My Tickets table/filters — only a short recent list, per handout §8.2.

**States**
- *Loading*: 4 skeleton cards + "Loading recent tickets..." text.
- *Empty*: "You have no tickets yet." in the recent-tickets panel; a brand-new Requester sees all-zero cards, never an error.
- *Safe failure*: "Unable to load your dashboard right now." (5xx) or "Unable to load your dashboard." (other errors) in an `alert`.

## 3. Actions Taken — Staff Ticket Detail
Component: `client/src/pages/staff/StaffTicketDetailPage.tsx`, `actions` tab (renamed from the Lab 3 placeholder "Service Actions" tab). Tab label shows a live count: `Actions Taken (N)`.

**List mode**
- Each row: author name + formatted date/time, an "Edit" button, then Description, Result, "Follow-Up Required? Yes/No", Follow-up Note (only rendered when Follow-Up Required is Yes and a note exists), Attachment Notes (only rendered when present).
- "+ Add Action Taken" button above the list, hidden while the create/edit form is open (one form visible at a time).
- Empty state (only when the list is empty **and** the form is closed): "No actions have been recorded on this ticket yet."

**Create / Edit mode (single shared form)**
- Fields, in order: Action Description (textarea, required), Result (textarea, required), Follow-Up Required? (checkbox), Follow-up Note (textarea, only rendered once Follow-Up Required? is checked, required in that case), Attachment Notes (single-line text, optional, placeholder "e.g. see screenshot-001.png in ticket email").
- Title reads "Add Action Taken" in create mode, "Edit Action Taken" in edit mode.
- Buttons: "Save Action Taken" (primary, disabled + shows "Saving..." while in flight) and "Cancel" (returns to list mode, discards the draft).
- Validation is both client-side (immediate, before any request is sent — description/result required, follow-up note required when Follow-Up Required is checked) and re-enforced server-side; a server-side validation error renders in a `role="alert"` box inside the form without closing it, so entered data is never lost on a rejected submission (handout §8.5's "important forms protect entered data after recoverable failures").
- On successful save, the list updates immediately from the response (no full page refetch required), a transient success message is shown, and the form closes.

## 4. Actions Taken — Requester Ticket Detail (read-only)
Component: `client/src/pages/TicketDetailPage.tsx`, a new card below Public Comments.
- Header: "Actions Taken (N)".
- Same field layout as the staff list view, but with **no** "Edit" button and **no** "Add Action Taken" button anywhere on this screen for this role — verified by `ActionsTaken.test.tsx`/`TicketWorkflow.test.tsx` asserting the relevant buttons are absent (`queryByRole` returns null), not merely visually hidden.
- Empty state: "No actions have been recorded on this ticket yet." (same copy as the staff view, for consistency).

## 5. Navbar — Dashboard Entry Point
- A new first nav item, "📊 Dashboard" (icon always shown; label hidden below `sm` via `d-none d-sm-inline`, matching the existing nav-item responsive pattern), linking to `/dashboard` for every role.
- Active-page indication: `bg-black bg-opacity-25` + `aria-current="page"` when `location.pathname === "/dashboard"`, matching the existing active-tab convention already used for My Tickets/Queue/Admin.
- `/dashboard` is the landing route after login and after a mandatory password change, for every role (handout §7's "clear active-page indication" is meaningful only if there is a consistent landing point to indicate).

## 6. Responsive and Accessibility Requirements (same baseline as Lab 2/3)
- No horizontal page scroll, clipped content, or overlapping controls at desktop (≥1200px), tablet (~768–1199px), or mobile (≤767px) widths, on every screen in this document.
- All interactive elements (metric-card links, tab buttons, form fields, Save/Cancel/Edit/Add/Refresh buttons) are reachable and operable by keyboard alone, with the existing visible-focus styling preserved.
- Every form field has a programmatically associated `<label htmlFor>` (verified in `ActionsTaken.test.tsx` via `getByLabelText`), not a placeholder-only label.
- Status and Follow-Up state are conveyed with both color and text (badge text label, "Follow-Up Required? Yes/No" text), never color alone.
- All validation and safe-failure messages render in a `role="alert"` element so they are announced to assistive technology.
- Empty states use plain descriptive text (not just a blank area), so a screen-reader user gets the same "nothing here yet" signal a sighted user gets visually.


## 7. UI Style and Final-Hardening Checklist
- Reuse the Lab 2/3 Zen Green tokens and patterns: primary green `#006B3C`, page background `#F5F7F6`, white `card border-0 shadow-sm rounded-3`, existing button/badge/table/form conventions, Bootstrap 5 utilities, and plain emoji icons. Do not introduce Tailwind, CSS variables, or a second visual system.
- Dashboard metric cards use consistent label/value hierarchy, spacing, border radius, focus state, and accessible link behavior.
- Ticket status, priority, Follow-Up Required, and private/shared content retain the existing non-color text cues.
- Loading, empty, forbidden, not-found, conflict, validation, and safe-failure states use the existing Lab 2/3 conventions.
- While an Actions Taken create/update request is in flight, Save is disabled and the form remains populated. Recoverable failure returns focus to the error area without clearing entered values.
- No duplicate/obsolete Dashboard navigation, duplicate controls, placeholder text, dead links, or unfinished buttons remain.
- Final visual inspection covers Staff Dashboard, Requester Dashboard, Staff Actions Taken, Requester Actions Taken, and Ticket Workflow at desktop/tablet/mobile.

## 8. Screenshot Evidence Matrix
| Screen | Desktop | Tablet | Mobile | States to capture |
|---|---|---|---|---|
| Staff Dashboard | Required | Required | Required | data, loading, empty, forbidden/safe failure |
| Requester Dashboard | Required | Required | Required | data, loading, zero-ticket, safe failure |
| Staff Actions Taken | Required | Required | Required | zero, one, multiple, create/edit, validation |
| Requester Actions Taken | Required | Required | Required | populated read-only, zero |
| Ticket Workflow | Required | Required | Required | permitted transitions, advisory resolved flag, conflict |
