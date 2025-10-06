# Design Guidelines: 受発注見込み入力システム

## Design Approach

**Selected Approach:** Design System + Enterprise References
- **Primary Reference:** Linear (clean data tables), Notion (spreadsheet interfaces)
- **System Foundation:** Carbon Design principles for enterprise applications
- **Rationale:** Utility-focused business application requiring efficiency, clarity, and professional presentation for extended work sessions

## Core Design Principles

1. **Clarity Over Decoration:** Every visual element serves functional purpose
2. **Information Density Management:** Balance comprehensive data display with readability
3. **Status-Driven Design:** Visual indicators communicate data state instantly
4. **Keyboard-First UX:** Visual design supports keyboard navigation prominence

## Color Palette

### Dark Mode (Primary)
- **Background Layers:**
  - Base: 220 15% 8%
  - Surface: 220 15% 12%
  - Elevated: 220 15% 16%
  - Grid cell active: 220 15% 20%

- **Primary/Brand:**
  - Main: 217 91% 60% (Blue for actions/focus)
  - Hover: 217 91% 65%
  
- **Status Colors:**
  - Success/Matched: 142 71% 45% (GL reconciled)
  - Warning/Fuzzy: 38 92% 50% (Fuzzy match)
  - Error/Unmatched: 0 84% 60% (Reconciliation failed)
  - Info: 199 89% 48% (Pending)

- **Text:**
  - Primary: 220 15% 95%
  - Secondary: 220 10% 65%
  - Muted: 220 10% 45%

### Light Mode
- **Background Layers:**
  - Base: 0 0% 100%
  - Surface: 220 15% 98%
  - Elevated: 220 15% 96%
  - Grid cell active: 217 91% 95%

- **Status Colors:** Same hues, adjusted lightness for contrast

## Typography

**Font Stack:** 
- Primary: 'Inter' (Google Fonts) for UI
- Monospace: 'JetBrains Mono' for numeric data cells

**Scale:**
- Headers (H1): font-semibold text-2xl (24px)
- Headers (H2): font-semibold text-xl (20px)  
- Grid Headers: font-medium text-sm (14px)
- Data Cells: font-normal text-sm (14px)
- Numeric Cells: font-mono text-sm (14px)
- Helper Text: font-normal text-xs (12px)
- Status Labels: font-medium text-xs uppercase tracking-wide

## Layout System

**Spacing Primitives:** Consistent use of units 1, 2, 3, 4, 6, 8, 12, 16
- Cell padding: p-2
- Section spacing: gap-4, gap-6
- Page margins: p-6 to p-8
- Component spacing: space-y-4

**Grid Layout:**
- Full-width data grid (no max-width constraint)
- Sidebar width: w-64 (256px) for filters/master data
- Toolbar height: h-14 (56px) fixed
- Status bar height: h-8 (32px)

## Component Library

### Data Grid
- **Cell States:**
  - Default: border-border bg-surface
  - Active/Editing: ring-2 ring-primary bg-elevated
  - Modified: border-l-4 border-l-warning
  - Error: bg-destructive/10 border-destructive
  - Read-only: bg-muted/50 text-muted-foreground

- **Row States:**
  - Default: border-b border-border
  - Hover: bg-muted/30
  - Selected: bg-primary/10
  - Matched (GL): bg-success/10 border-l-2 border-l-success
  - Unmatched: bg-destructive/10 border-l-2 border-l-destructive

### Navigation & Toolbar
- **Top Toolbar:** Sticky, glass-morphism effect (backdrop-blur-md bg-surface/80)
- **Action Buttons:** Primary actions use filled buttons, secondary use ghost variants
- **Keyboard Hint Badges:** Outlined pills with monospace font showing shortcuts

### Forms & Inputs
- **Autocomplete Dropdowns:** Max height with virtual scrolling, search highlight
- **Date Pickers:** Calendar popover with range selection support
- **Validation:** Inline error messages below inputs, shake animation on error

### Status Indicators
- **Reconciliation Status Badges:**
  - Matched: rounded-full px-2 py-1 bg-success/20 text-success border border-success/30
  - Fuzzy Match: rounded-full px-2 py-1 bg-warning/20 text-warning border border-warning/30
  - Unmatched: rounded-full px-2 py-1 bg-destructive/20 text-destructive border border-destructive/30

### Modals & Overlays
- **GL Reconciliation Panel:** Slide-over from right, w-96 to w-1/2
- **Bulk Edit Modal:** Centered, max-w-2xl
- **Confirmation Dialogs:** Centered, max-w-md with clear action buttons

## Interaction Patterns

### Keyboard Shortcuts Visibility
- **Persistent Shortcut Bar:** Bottom-right floating panel (can collapse)
- **Tooltip Hints:** Show keyboard shortcuts in button tooltips
- **Command Palette:** Ctrl+K style searchable command menu

### Data Grid Interactions
- **Cell Navigation:** Visual focus ring follows Tab/Arrow keys
- **Multi-select:** Checkbox column + Shift+Click for range selection
- **Copy/Paste:** Visual feedback on paste (brief highlight animation)
- **Inline Editing:** Double-click or Enter to activate, ESC to cancel

### GL Reconciliation Flow
1. Period selector (dropdown) → 2. Auto-match button → 3. Results grid with color-coded rows → 4. Drill-down panel for unmatched items
- **Visual Flow:** Left-to-right workflow with progress indicators

## Special Considerations

### Excel-like Features
- **Column Resizing:** Drag handles with cursor feedback
- **Column Reordering:** Drag-and-drop with ghost preview
- **Frozen Headers:** Sticky positioning with shadow on scroll
- **Context Menus:** Right-click menus for row operations

### Performance Indicators
- **Loading States:** Skeleton screens for grid, spinner for operations
- **Optimistic Updates:** Immediate visual feedback, subtle undo notification
- **Sync Status:** Small indicator in toolbar showing last sync time

### Accessibility
- **High Contrast Mode:** Ensure all status colors meet WCAG AA
- **Focus Indicators:** 2px solid ring with 2px offset
- **Screen Reader:** ARIA labels for grid cells, row announcements

## No Images
This is a data-focused business application - no hero images or decorative photography needed. Visual hierarchy achieved through layout, typography, and functional color usage.