# Lab 3 UI Specification — Zen Green (extends Lab 2)

> This document extends `docs/lab-02/ui-spec.md` and the **actual implemented** Lab 2 client
> (`client/src/`), not a re-imagined design system. Every token, breakpoint, and component pattern
> below is taken from the real Lab 2 source (files cited inline). New Lab 3 screens reuse these
> exactly; no new visual language is introduced, per handout §7 ("New screens must look like part of
> the same application rather than a second visual system").

## 0. What Lab 2 Actually Implements (ground truth for this document)

Read directly from `client/src/` before writing this spec:

- **Styling method**: Bootstrap 5 utility classes (`className="card border-0 shadow-sm rounded-3 ..."`)
  combined with inline `style={{ backgroundColor: "#..." }}` for the Zen Green palette — not CSS
  variables, not styled-components, not Tailwind. Lab 3 screens must follow the same pattern:
  Bootstrap layout/spacing utilities + inline hex for brand colors.
- **Icons**: plain emoji characters used inline (⏱ wordmark icon, 📄 My Tickets, ➕ Create Ticket,
  👤 profile avatar, 🔄 Change Requester, 🔍 search, 👥 requester icon), not an icon library. Lab 3
  keeps this convention (e.g. 🎫 or 📋 for My Queue, 🛡️ or ⚙️ for Admin — pick one and use it
  consistently, do not introduce an icon font).
- **Shell**: `Navbar.tsx` — fixed top bar, `backgroundColor: "#006B3C"`, brand link + two nav `Link`s,
  a profile dropdown on the right built from a `useState` toggle (not a UI library dropdown).
  `App.tsx` wraps ticket routes in a local `ProtectedLayout` component that currently checks
  `currentRequester` from `RequesterContext` and redirects to `/select-requester` if absent.
- **Identity/session state to be removed (BR-32)**: `RequesterContext.tsx` persists the selected
  requester in `localStorage.setItem("selectedRequester", ...)`, and `SelectRequesterPage.tsx` is the
  screen that sets it. Both are deleted in Lab 3, not just hidden — no import of either file, and no
  `localStorage` key named `selectedRequester`, may remain anywhere in `client/src` (verified by
  `MIG-02` in `tests.md`).
- **List screen pattern** (`TicketListPage.tsx`): a filter card (`card border-0 shadow-sm rounded-3
  mb-4 p-3 bg-white`) above a data card containing a `table-responsive d-none d-md-block` desktop
  table and a separate `d-md-none` mobile card-list rendered from the *same* data — two render paths,
  not a CSS-only reflow. Pagination shows "Showing X to Y of Z tickets" plus a **page-size selector
  with options 5, 8, 10, 20** (page resets to 1 on size change), and Previous/Next with a page-number
  indicator.
- **Badges**: `rounded-pill px-3 py-1 fw-normal` with inline `backgroundColor` / `color` / `border`.
  Actual implemented values today:
  | Value | Background | Text | Border |
  |---|---|---|---|
  | Priority – High | `#FDE8E8` | `#9B1C1C` | `#F8B4B4` |
  | Priority – Medium | `#FEF08A` | `#854D0E` | `#FDE047` |
  | Priority – Low | `#DEF7EC` | `#03543F` | `#BCF0DA` |
  | Status – Open | `#EBF5FF` | `#1E429F` | `#C3DDFD` |
  | Status – Pending | `#FEF08A` | `#854D0E` | `#FDE047` |
  | Status – New / In Progress / Resolved | `#DEF7EC` | `#03543F` | `#BCF0DA` *(all three currently share one color — see §1.1 below)* |

### 0.1 Known Lab 2 issue this spec must fix, not repeat
`New`, `In Progress`, and `Resolved` currently render as the **identical** green badge in
`getStatusBadge()`. That was harmless in Lab 2 (no real workflow existed yet), but Lab 3 introduces 8
required statuses (BR-15) with a real transition matrix (BR-18) that IT Staff must scan at a glance in
the Queue. Reusing one color for three-plus statuses would make the Queue unreadable and would violate
handout §7's badge-consistency requirement. §1.1 below defines eight visually distinct values using the
*same visual formula* (pale background + saturated text + matching light border, `rounded-pill`), so the
component stays a drop-in extension of `getStatusBadge()` rather than a redesign.

---

## 1. Extended Tokens for Lab 3

No new colors are introduced for elements Lab 2 already covers (Priority badges, primary/secondary
buttons, page background, card surface, error/success text) — those are reused byte-for-byte from
`client/src/pages/TicketListPage.tsx` and `docs/lab-02/ui-spec.md` §1. Only genuinely new elements get
new tokens, chosen to sit visually inside the existing palette family.

### 1.1 Status Badge — all 8 required values
| Status | Background | Text | Border | Rationale |
|---|---|---|---|---|
| New | `#F3F4F6` | `#374151` | `#E5E7EB` | Neutral gray — "not yet started," distinct from every action color |
| Open | `#EBF5FF` | `#1E429F` | `#C3DDFD` | **Unchanged** — reused exactly from existing `getStatusBadge()` |
| In Progress | `#FEF3C7` | `#92400E` | `#FDE68A` | Amber, distinct from Medium-priority's `#FEF08A` family so the two columns never look identical side by side |
| Waiting for Requester | `#F3E8FF` | `#6B21A8` | `#E9D5FF` | New purple family — this status has no Lab 2 precedent and needs its own identity ("the ball is in the requester's court") |
| Resolved | `#DEF7EC` | `#03543F` | `#BCF0DA` | **Unchanged** — reused exactly (the green Lab 2 already associates with a good outcome) |
| Closed | `#E5E7EB` | `#1F2937` | `#D1D5DB` | Darker neutral than New — visually "settled," not "not started" |
| Reopened | `#FFEDD5` | `#9A3412` | `#FED7AA` | Orange — warns the viewer this ticket regressed, without reusing red (reserved for Cancelled/High) |
| Cancelled | `#FDE8E8` | `#9B1C1C` | `#F8B4B4` | **Unchanged** — reused exactly from Priority-High, since both mean "stop, do not proceed" |

All eight keep the exact `rounded-pill px-3 py-1 fw-normal` shape with inline `backgroundColor`/`color`/
`border`, matching `getStatusBadge()`'s existing implementation pattern in `TicketListPage.tsx`.

### 1.2 Role Badge (new — no Lab 2 precedent)
| Role | Background | Text | Border |
|---|---|---|---|
| Requester | `#F3F4F6` | `#374151` | `#E5E7EB` |
| IT Staff | `#EBF5FF` | `#1E429F` | `#C3DDFD` |
| Administrator | `#006B3C` (solid) | `#FFFFFF` | none |

Same pill shape as every other badge; Administrator is solid Primary Green to signal elevated privilege,
matching the header bar color so it reads as "the app's own color, not a generic badge."

### 1.3 Internal Note panel background (new)
Public Comments reuse the existing white card surface (`bg-white`, `border-0 shadow-sm rounded-3`,
matching every other card in the app). Internal Notes get one new token so the two are impossible to
confuse (handout §8.4's core requirement):
- Internal Note panel background: `#FEFBEA` (very pale amber) with a `#FDE68A` 1px top border and a
  small 🔒 glyph (consistent with the emoji-icon convention in §0) in the panel header reading
  "Internal Notes — visible only to IT Staff and Administrator."

---

## 2. Screen-by-Screen Specification

### 2.1 Login and Change Password
**Replaces**: `SelectRequesterPage.tsx` and its route `/select-requester`.
**New routes**: `/login`, and the same route renders the mandatory Change Password form in place when
`mustChangePassword` is true (no separate URL, mirroring how Lab 2 keeps `SelectRequesterPage` as one
screen with conditional content).
**New context**: replaces `RequesterContext.tsx` with an `AuthContext.tsx` that calls `GET /api/auth/me`
on mount (as `RequesterContext` currently calls `getRequesters()` on mount) and holds `{ id, name, role,
mustChangePassword }` in React state — **no `localStorage` persistence**; the httpOnly session cookie is
the only persistence layer (BR-32, FR-03).

Layout follows the exact card pattern from `SelectRequesterPage.tsx`: centered `container` (max-width
~650px per that page's convention) on the `#F5F7F6` page background, a single `card border-0 shadow-sm
rounded-4 p-4 p-md-5 bg-white text-center` containing:
- Login: email input, password input (with a plain-text/hide toggle button, reusing the existing
  `btn`-style icon-button pattern rather than a new component), inline `alert alert-danger py-2 small`
  for errors (same class Lab 2 already uses for its own error banners), primary button styled exactly
  like Lab 2's primary green button (`btn` + `style={{ backgroundColor: "#006B3C" }}` + white text).
- Change Password: current/new/confirm password inputs, a small checklist below built the same way
  `SelectRequesterPage.tsx` builds its info banner (a `small text-muted` block, not a new component),
  each of the four rules toggling between muted and `#16A34A` (Lab 2's existing Success State token)
  with a ✓/– glyph as the value passes.

### States
| State | Behavior |
|---|---|
| Loading | `py-4 text-muted small` "Checking session…" — same idiom as `SelectRequesterPage`'s "Loading active requesters..." |
| Validation | Inline `alert alert-danger py-2 small` under the form, matching Lab 2's existing error-banner class exactly |
| Success | Redirect into `/tickets`, `/queue`, or `/admin/users` depending on role (see §2.2) |
| Conflict (409) | Change Password: reused-temporary-password (BR-05) shown as the same inline `alert-danger` |
| Safe Failure (5xx) | Same `alert alert-danger py-2 small mb-4 text-start` class `SelectRequesterPage.tsx` already uses for its fetch-failure case |

Invalid credentials and inactive account (BR-01, FR-02) render byte-identical copy and styling.

---

### 2.2 App Shell (`Navbar.tsx` + `App.tsx`)
**Direct edits to existing files, not new components.**

`Navbar.tsx` changes:
- Remove the "Change Requester" dropdown item and its `handleSwitchRequester` handler entirely (BR-32).
- Replace `currentRequester?.name` with the authenticated user's name from `AuthContext`, and add the
  Role Badge (§1.2) next to it inside the same dropdown header block that currently shows name + email.
- Replace the dropdown's single action with **Logout** (calls `POST /api/auth/logout`, clears
  `AuthContext` state, navigates to `/login`) — same `dropdown-item px-3 py-2 small ...` button class
  already used for "Change Requester" today, just relabeled and rewired.
- Nav links become role-conditional using the same `Link` + active-state pattern already in the file
  (`isMyTickets`/`isCreateTicket` booleans generalize to a `role`-keyed lookup): Requester sees the
  existing 📄 My Tickets / ➕ Create Ticket pair unchanged; IT Staff and Administrator both see a new
  🎫 My Queue link to `/queue` — Administrator is included here specifically because
  `specification.md` FR-19 and §12 grant Administrator the same Ticket read/operate permissions as
  IT Staff (per handout §4.3's "unless the approved authorization matrix explicitly permits it" — this
  spec explicitly permits it); Administrator additionally sees a new ⚙️ Admin link to `/admin/users`,
  which IT Staff never sees.

`App.tsx` changes:
- `ProtectedLayout` currently gates on `currentRequester` from `RequesterContext`; it is generalized to
  gate on `AuthContext`'s authenticated user, and a second wrapper (or a `requiredRole` prop on the same
  component) enforces role before rendering `/queue` or `/admin/users` routes — mirroring the existing
  `if (!currentRequester) return <Navigate to="/select-requester" />` pattern, now redirecting to
  `/login` and, for a role mismatch, to a small "Not available" page rather than the ticket routes.
- The root redirect (`<Route path="/" element={<Navigate to="/select-requester" replace />} />`) becomes
  `<Navigate to="/login" replace />`; the catch-all route is updated the same way.

### States
Same as §2.1's Success/Safe-Failure rows plus: any `401` from any API call while inside `ProtectedLayout`
immediately clears `AuthContext` and navigates to `/login` (AC-06, AC-27) — implemented as a shared
response interceptor in `api.ts` (the same file that already centralizes `getRequesters`,
`getTicketById`, etc.), not duplicated per-page.

---

### 2.3 Requester Ticket List and Detail (`TicketListPage.tsx`, `TicketDetailPage.tsx`, `CreateTicketPage.tsx`)
**No new routes.** These three existing pages are edited in place, not replaced:
- Every call site that currently reads `currentRequester.id` (from `RequesterContext`) reads the
  authenticated user's id from `AuthContext` instead. `CreateTicketPage.tsx`'s hidden/derived requester
  reference changes the same way — no client-supplied `requesterId` field exists in either page after
  this change (FR-09, BR-08).
- `TicketDetailPage.tsx` gains a **Public Comments** panel using the same card styling
  (`border-0 shadow-sm rounded-3 bg-white`) as its existing Attachment section, placed as an additional
  tab/section alongside Attachments — reusing that section's existing tab-like layout rather than
  inventing a new one. A comment row shows author name + the new Role Badge (§1.2) + timestamp +
  content, matching the existing Attachment row's `fw-bold` name / `text-muted` metadata layout.
- A **"Mark problem appears resolved"** control is added near the existing status display, styled as a
  secondary button (`btn btn-light border ...`, the same class already used for the "Filters" button in
  `TicketListPage.tsx`), toggling to a static `alert` -style confirmation chip once set.
- Internal Notes are never fetched or rendered on this page at all — not present in the component tree,
  not just visually hidden (FR-12, BR-22).

### States
Unchanged from `docs/lab-02/ui-spec.md` §4.4/§4.5 (Empty vs. No-Results distinction, five-state
Attachment treatment, `is-invalid` validation pattern) plus: **Not-Found (404)** now covers both "ticket
doesn't exist" and "ticket exists but isn't yours" with identical copy, since the backend returns 404 for
both per the FR-07 existence-hiding policy (AC-28) — the page cannot and must not try to tell these apart.

---

### 2.4 Ticket Queue (`/queue`) — IT Staff and Administrator (FR-19) — new page, `TicketListPage.tsx` as its template

Accessible to both IT Staff and Administrator sessions, identically, per `specification.md` FR-19/§12.
A Requester session that requests this route receives 403 at the API layer (AC-25) and never sees the
link at all (§2.2).
**New file**: `client/src/pages/staff/StaffTicketQueuePage.tsx`, built by copying the proven structure of
`TicketListPage.tsx` rather than designing a new list screen:
- Same filter-card-above-data-card layout, same `input-group input-group-sm` search box (🔍 icon),
  same `d-none d-md-block` table / `d-md-none` card-list dual render path, same page-size selector
  (5/8/10/20) and Previous/Next pagination footer, same "Showing X to Y of Z tickets" copy pattern.
- New filter controls added to the same filter-card row: **Owner** (`form-select form-select-sm`,
  options are active IT Staff/Administrator names — per BR-11, a Ticket Owner must be one of these two
  roles — plus a literal "Unassigned"), and **IT Priority**
  alongside the existing Requested Priority filter select.
- New table columns beyond Lab 2's set: **IT Priority** (already a filter, now also a column, using the
  same badge component as Requested Priority) and **Owner** (plain text, "Unassigned" in
  `text-muted fst-italic` matching the existing empty-state italic convention).
- Status column uses the extended 8-value badge set from §1.1 instead of `TicketListPage.tsx`'s current
  3-color set — this is the one place the badge component itself needs new cases added, everything else
  in this screen is a structural copy.
- Row click navigates to `/queue/:id` instead of `/tickets/:id`.

### States
Same five states `TicketListPage.tsx` already handles (loading, Empty, No-Results, table failure,
success) plus **Forbidden (403)**, which `TicketListPage.tsx` has never needed (a Requester's own ticket
list can't be "forbidden") — rendered as a full-width `alert alert-danger` replacing the data card,
consistent with the existing alert class used elsewhere on this page family.

---

### 2.5 Ticket Detail — IT Staff and Administrator (FR-19) (`/queue/:id`) — new page, `TicketDetailPage.tsx` as its template

Claim/reassign, IT Priority, and status-transition controls below are available identically to IT Staff
and Administrator sessions, per `specification.md` FR-19/§12 — not because Administrator is being
folded into "IT Staff" generally, but because this specific spec explicitly extended Ticket
read/operate permissions to Administrator. Administrator's *own* dedicated screen remains
§2.6 (User Management) only; nothing here is exposed in the Admin screen itself.
**New file**: `client/src/pages/staff/StaffTicketDetailPage.tsx`, extending the read-only field grid
already built in `TicketDetailPage.tsx` (Ticket No., Category, Related System, Requester, Requested
Priority badge, Summary, Description all reused as-is) with three additional editable controls and a
tabbed communication panel:
- **Ticket Owner**: `form-select form-select-sm`, listing only active IT Staff/Administrator users
  (BR-11 — no Requester can ever appear as an option here) plus a "Claim for myself" shortcut option
  when unassigned (BR-12).
- **IT Priority**: `form-select form-select-sm` using the same Priority badge/option values as Requested
  Priority, independently editable (BR-14).
- **Current Status**: `form-select form-select-sm`, options filtered client-side to only the permitted
  next values from BR-18 given the ticket's current status — never renders a non-permitted option.
- Tab strip below the field grid, in the same visual position as `TicketDetailPage.tsx`'s existing
  Attachment section: **Public Comments** · **Internal Notes** (🔒, distinct `#FEFBEA` background per
  §1.3) · **Attachments** (existing five-state treatment, unchanged, reused as-is) · **Service Actions**
  (placeholder tab, "Coming in Lab 4," present but inert so its absence is never mistaken for a bug).

### States
| State | Behavior |
|---|---|
| Loading | Skeleton grid, same idiom as the Requester detail page's own loading state |
| Validation | Comment/Note post: empty/whitespace blocked client-side (mirrors the existing removal-reason validation pattern already in `TicketDetailPage.tsx`'s Soft Remove modal) |
| Success | Each field save shows an inline confirmation next to that field, not a full-page reload |
| Empty | A tab with zero items: same `text-center py-5 text-muted` idiom `TicketListPage.tsx` uses for its own empty table body |
| Not-Found (404) | Ticket id no longer exists: full-page message, "Back to Queue" link |
| Conflict (409) | Status dropdown reverts to the last known valid value on a rejected transition, with an inline error naming the reason — never displays the rejected value as if it succeeded |
| Safe Failure (5xx) | `alert alert-danger py-2 small` per failed field save, matching every other error banner in the app |

---

### 2.6 Administrator User Management (`/admin/users`) — new page
**New file**: `client/src/pages/admin/UserManagementPage.tsx`, reusing `TicketListPage.tsx`'s
filter-card-above-data-card structure for the list side, plus a right-hand panel modeled on
`CreateTicketPage.tsx`'s form-card conventions (labeled fields, `is-invalid` validation, primary/
secondary button pair) for Create/Edit.

- List: search input (🔍, same `input-group input-group-sm` as every other search box in the app), a
  single Role filter select (Requester/IT Staff/Administrator/All — one filter only, per handout §8.5),
  table with **Name, Email, Role (badge, §1.2), Status (Active/Inactive using the existing Success/Error
  token colors), Edit** action. **No pagination control** — see §3 below for why.
- Create/Edit panel: Full Name, Email, Role (`form-select`), Active toggle (Bootstrap `form-check
  form-switch`, matching the mockup's toggle), and an Initial Password section — on Create, a field with
  helper text "User will be required to change this password at first login"; on Edit, a
  "Set New Initial Password" button that reveals the field only when clicked, so editing name/email
  doesn't force a password touch every time.
- "Save User" primary button and, in Edit mode only, "Deactivate/Activate User" secondary button —
  disabled with a tooltip for the two safety-rule cases (BR-27 self, BR-28 last admin); if bypassed, the
  server's 409 renders as the same `alert alert-danger` pattern used everywhere else, naming which rule
  blocked it.

### States
| State | Behavior |
|---|---|
| Loading | Skeleton rows, same idiom as the Queue |
| Validation | Required-field `is-invalid` styling, same class/positioning as `docs/lab-02/ui-spec.md` §3.1 |
| Success | Toast/banner reusing the existing `alert alert-success`-style pattern (Lab 2's `#16A34A` Success State token) |
| Empty | "No users yet." (should not occur post-seed) |
| No-Results | Search/role-filter match nothing: "No users match your search." + Clear action, same copy pattern as the Queue's No-Results state |
| Not-Found (404) | Editing a concurrently-removed user id: panel closes with a message, list refreshes |
| Conflict (409) — 3 causes | Duplicate email → inline field error. Self-deactivation → named banner. Last-active-Administrator → named banner. Each distinct, per `tests.md` UI-11. |
| Safe Failure (5xx) | Generic `alert alert-danger`; entered field values are preserved, nothing is lost |

---

## 3. Explicit Deviation from the Handout's Own Mockup

The handout's §8.5 mockup image shows page-number pagination on the Admin Users list. This spec follows
§8.5's **text** instead ("pagination for the user list" is listed under "The following are not
required"), consistent with `specification.md` §12's recorded assumption. The Admin list therefore
scrolls within its container rather than paging, unlike the Requester Ticket List and the IT Staff Queue,
which both keep Lab 2's real page-size-selector pattern because handout §6 requires pagination on the
Queue specifically.

---

## 4. Responsive Breakpoints (unchanged from Lab 2 — Bootstrap defaults already in use)
| Viewport | Width | Behavior |
|---|---|---|
| Desktop | ≥ 992px | Multi-column grid; full data table (`d-md-block`) |
| Tablet | 768–991px | Two-column form reflow; table remains via horizontal scroll where needed |
| Mobile | < 768px | Single-column stack; `TicketListPage.tsx`'s dual-render pattern (`d-md-none` card list) reused for the Queue and User list; touch-friendly 44px+ tap targets |

No new breakpoints are introduced. Every new screen in §2 above reuses the exact `d-none d-md-block` /
`d-md-none` dual-render pattern already proven in `TicketListPage.tsx`, rather than a CSS-only reflow, so
mobile rendering is verified by rendering the actual mobile branch, matching how Lab 2 tests it today.

## 5. Accessibility
Unchanged from `docs/lab-02/ui-spec.md` §6, including its **honestly-scoped deferred item**
(`aria-busy`/`aria-disabled` not yet implemented — carried forward as still-deferred for Lab 3's new
screens too, unless a Lab 3 issue explicitly adds them). New badges (§1.1, §1.2) each carry the value as
visible text, never color-only, matching the existing non-color-indicator rule.
