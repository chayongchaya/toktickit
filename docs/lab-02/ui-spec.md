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

## 2. Component Design & Behavior

### 2.1 Inputs & Form Controls
- **Editable Fields**: White background (`#FFFFFF`), neutral border (`#D1D5DB`), focused border (`#0B7A46`) with subtle outline.
- **Read-Only Fields**: Shaded background (`#F0F4F1`) with crisp text, distinctly non-editable.
- **Field Labels**: Positioned directly above inputs with a red asterisk (`*`) indicating mandatory fields.
- **Validation Messages**: Displayed immediately beneath the corresponding field in red text (`#DC2626`).
- **Textarea**: Dedicated multiline height for Description (min-height: 120px).

### 2.2 Button Hierarchy
- **Primary Action**: Solid `#006B3C` background with white text (e.g., *Submit Ticket*, *Continue*).
- **Secondary Action**: White background with `#006B3C` border and text (e.g., *Cancel*, *Back to My Tickets*).
- **Destructive Action**: `#DC2626` outline or solid for deleting/removing attachments.
- **Disabled / Busy State**: Muted opacity (50%), cursor `not-allowed`, and a loading spinner indicator while processing.

### 2.3 Status and Priority Badges
- **Status Badges**:
  - `New`: Pale Green (`#EAF6EF` text `#006B3C`).
  - `In Progress`: Soft Blue/Indigo (`#EEF2FF` text `#4F46E5`).
  - `Resolved`: Soft Teal (`#ECFDF5` text `#059669`).
- **Priority Badges**:
  - `Low`: Pale Green/Gray (`#F3F4F6` text `#4B5563`).
  - `Medium`: Amber (`#FEF3C7` text `#D97706`).
  - `High`: Pale Red (`#FEE2E2` text `#DC2626`).

---

## 3. Screen Specifications

### 3.1 Development Requester Selection Screen
- Centered card layout on `#F5F7F6` background.
- Prominent info banner stating this is a simulated testing context for Lab 2.
- Requester dropdown populated only with active requesters.
- Action button: *Continue*.

### 3.2 Create Ticket Screen
- **Header**: Read-only Ticket Number ("Assigned upon creation") and Requester Name autofilled from context.
- **Form Section**:
  - Row 1: Category dropdown and Related System dropdown.
  - Row 2: Requested Priority dropdown.
  - Row 3: Ticket Summary input field.
  - Row 4: Description textarea.
- **Attachment Section**:
  - File picker accepting `.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf`
    (maximum 5 MB per file and 5 active files per ticket).
  - Real-time client validation for rejected files.
- **Footer**: *Cancel* and *Submit Ticket* buttons.

### 3.3 My Tickets Screen
- **Filter Bar**: Search bar (number/summary), Category filter, Priority filter, Status filter, and *Clear Filters* button.
- **Data Table (Desktop)**: Columns: Ticket No., Created Date, Summary, Category, Requested Priority, IT Priority, Current Status, Last Updated.
- **Pagination**: Includes a page-size selector with options **5, 8, 10, and 20** tickets per page. Changing the page size resets the current page to page 1. The screen also displays the current page indicator and Previous/Next navigation.
- **Empty / No-Results States**: Clear informative illustration and message when no records match.

### 3.4 Requester Ticket Detail Screen
- Full read-only view of ticket metadata.
- **Attachment Tab**:
  - List of active attachments with a *Download* button.
  - *Add Attachment* button (disabled if 5 active files reached).
  - *Soft Remove* button opening a modal prompting for a mandatory removal reason.
  - Removed attachments listed with metadata and removal reason; download/preview action is disabled.

---

## 4. Responsive Breakpoints

| Viewport | Screen Width | Required Layout Behavior |
| :--- | :--- | :--- |
| **Desktop** | ≥ 992px | Multi-column grid, full data table with horizontal alignment. |
| **Tablet** | 768px–991px | Two-column form layout, table with horizontal scroll or adjusted column widths. |
| **Mobile** | < 768px | Single-column stacked fields, table converted into card-based list, touch-friendly buttons. |

---

## 5. Visual Inspection Checklist
- [x] Primary Green (`#006B3C`) and Pale Green (`#EAF6EF`) applied accurately.
- [x] Red asterisk (`*`) shown on all mandatory field labels.
- [x] Error messages positioned directly under inputs.
- [x] No horizontal layout breaking or overlapping on 375px mobile viewport.
- [x] Soft-removed attachments clearly disabled from downloading.
