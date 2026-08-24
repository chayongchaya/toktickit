# TokTickIT UI & Responsive Specification (Zen Green Theme)

## 1. Visual Design & Theme Tokens
This specification defines the visual standards for Lab 2 following the Zen Green Theme[cite: 1].

| Token / Element | Color Code | Usage |
| :--- | :--- | :--- |
| **Primary Green** | `#006B3C` | App header bar, primary action buttons, strong emphasis[cite: 1] |
| **Secondary Green** | `#0B7A46` | Active navigation tabs, links, hover states, focused borders[cite: 1] |
| **Pale Green** | `#EAF6EF` | Selected rows, success callouts, subtle section highlights[cite: 1] |
| **Page Background** | `#F5F7F6` | Neutral near-white background[cite: 1] |
| **Surface / Card** | `#FFFFFF` | Form cards, tables, modal containers with subtle border `#E5E7EB`[cite: 1] |
| **Text Primary** | `#1C2A22` | Dark charcoal-green for comfortable reading[cite: 1] |
| **Text Muted** | `#6B7280` | Subtitles, timestamps, helper descriptions |
| **Error State** | `#DC2626` | Text, borders, and error badges; dark red[cite: 1] |
| **Warning State** | `#D97706` | Amber badges and callouts[cite: 1] |
| **Success State** | `#16A34A` | Green confirmation indicators[cite: 1] |

---

## 2. Component Design & Behavior

### 2.1 Inputs & Form Controls
- **Editable Fields**: White background (`#FFFFFF`), neutral border (`#D1D5DB`), focused border (`#0B7A46`) with subtle outline[cite: 1].
- **Read-Only Fields**: Shaded background (`#F0F4F1`) with crisp text, distinctly non-editable[cite: 1].
- **Field Labels**: Positioned directly above inputs with a red asterisk (`*`) indicating mandatory fields[cite: 1].
- **Validation Messages**: Displayed immediately beneath the corresponding field in red text (`#DC2626`)[cite: 1].
- **Textarea**: Dedicated multiline height for Description (min-height: 120px)[cite: 1].

### 2.2 Button Hierarchy
- **Primary Action**: Solid `#006B3C` background with white text (e.g., *Submit Ticket*, *Continue*)[cite: 1].
- **Secondary Action**: White background with `#006B3C` border and text (e.g., *Cancel*, *Back to My Tickets*).
- **Destructive Action**: `#DC2626` outline or solid for deleting/removing attachments.
- **Disabled / Busy State**: Muted opacity (50%), cursor `not-allowed`, and a loading spinner indicator while processing[cite: 1].

### 2.3 Status and Priority Badges
- **Status Badges**:
  - `New`: Pale Green (`#EAF6EF` text `#006B3C`)[cite: 1].
  - `In Progress`: Soft Blue/Indigo (`#EEF2FF` text `#4F46E5`).
  - `Resolved`: Soft Teal (`#ECFDF5` text `#059669`).
- **Priority Badges**:
  - `Low`: Pale Green/Gray (`#F3F4F6` text `#4B5563`).
  - `Medium`: Amber (`#FEF3C7` text `#D97706`).
  - `High`: Pale Red (`#FEE2E2` text `#DC2626`).

---

## 3. Screen Specifications

### 3.1 Development Requester Selection Screen
- Centered card layout on `#F5F7F6` background[cite: 1].
- Prominent info banner stating this is a simulated testing context for Lab 2[cite: 1].
- Requester dropdown populated only with active requesters[cite: 1].
- Action button: *Continue*[cite: 1].

### 3.2 Create Ticket Screen
- **Header**: Read-only Ticket Number ("Assigned upon creation") and Requester Name autofilled from context[cite: 1].
- **Form Section**:
  - Row 1: Category dropdown and Related System dropdown[cite: 1].
  - Row 2: Requested Priority dropdown[cite: 1].
  - Row 3: Ticket Summary input field[cite: 1].
  - Row 4: Description textarea[cite: 1].
- **Attachment Section**:
  - File picker accepting `.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf` (Max 5 MB each, max 5 files total)[cite: 1].
  - Real-time client validation for rejected files[cite: 1].
- **Footer**: *Cancel* and *Submit Ticket* buttons[cite: 1].

### 3.3 My Tickets Screen
- **Filter Bar**: Search bar (number/summary), Category filter, Priority filter, Status filter, and *Clear Filters* button[cite: 1].
- **Data Table (Desktop)**: Columns: Ticket No., Created Date, Summary, Category, Requested Priority, IT Priority, Current Status, Ticket Owner, Last Updated[cite: 1].
- **Pagination**: Page size selector, current page indicator, Previous/Next navigation[cite: 1].
- **Empty / No-Results States**: Clear informative illustration and message when no records match[cite: 1].

### 3.4 Requester Ticket Detail Screen
- Full read-only view of ticket metadata[cite: 1].
- **Attachment Tab**:
  - List of active attachments with a *Download* button[cite: 1].
  - *Add Attachment* button (disabled if 5 active files reached)[cite: 1].
  - *Soft Remove* button opening a modal prompting for a mandatory removal reason[cite: 1].
  - Removed attachments listed with metadata and removal reason; download/preview action is disabled[cite: 1].

---

## 4. Responsive Breakpoints

| Viewport | Screen Width | Required Layout Behavior |
| :--- | :--- | :--- |
| **Desktop** | $\ge 992\text{ px}$ | Multi-column grid, full data table with horizontal alignment[cite: 1]. |
| **Tablet** | $768\text{ px} - 991\text{ px}$ | Two-column form layout, table with horizontal scroll or adjusted column widths[cite: 1]. |
| **Mobile** | $< 768\text{ px}$ | Single column stacked fields, table converted into card-based list, touch-friendly buttons[cite: 1]. |

---

## 5. Visual Inspection Checklist
- [ ] Primary Green (`#006B3C`) and Pale Green (`#EAF6EF`) applied accurately[cite: 1].
- [ ] Red asterisk (`*`) shown on all mandatory field labels[cite: 1].
- [ ] Error messages positioned directly under inputs[cite: 1].
- [ ] No horizontal layout breaking or overlapping on 375px mobile viewport[cite: 1].
- [ ] Soft-removed attachments clearly disabled from downloading[cite: 1].