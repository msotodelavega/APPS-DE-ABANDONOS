---
name: Institutional Productivity System
colors:
  surface: '#faf9f8'
  surface-dim: '#dadad9'
  surface-bright: '#faf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f2'
  surface-container: '#efeeed'
  surface-container-high: '#e9e8e7'
  surface-container-highest: '#e3e2e1'
  on-surface: '#1a1c1c'
  on-surface-variant: '#404752'
  inverse-surface: '#2f3130'
  inverse-on-surface: '#f1f0ef'
  outline: '#717783'
  outline-variant: '#c0c7d4'
  surface-tint: '#0060ab'
  primary: '#005faa'
  on-primary: '#ffffff'
  primary-container: '#0078d4'
  on-primary-container: '#ffffff'
  inverse-primary: '#a3c9ff'
  secondary: '#0061a3'
  on-secondary: '#ffffff'
  secondary-container: '#5badff'
  on-secondary-container: '#003f6d'
  tertiary: '#1160a4'
  on-tertiary: '#ffffff'
  tertiary-container: '#3779bf'
  on-tertiary-container: '#ffffff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d3e3ff'
  primary-fixed-dim: '#a3c9ff'
  on-primary-fixed: '#001c39'
  on-primary-fixed-variant: '#004883'
  secondary-fixed: '#d1e4ff'
  secondary-fixed-dim: '#9ecaff'
  on-secondary-fixed: '#001d36'
  on-secondary-fixed-variant: '#00497d'
  tertiary-fixed: '#d3e4ff'
  tertiary-fixed-dim: '#a2c9ff'
  on-tertiary-fixed: '#001c38'
  on-tertiary-fixed-variant: '#004881'
  background: '#faf9f8'
  on-background: '#1a1c1c'
  surface-variant: '#e3e2e1'
typography:
  display:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  sidebar_width: 240px
  topbar_height: 48px
---

## Brand & Style
The design system is engineered for high-density administrative environments where clarity, speed of data entry, and institutional trust are paramount. It targets government officials and department leads who require a reliable, "no-surprises" interface for managing complex workflows and public services.

The style is **Corporate / Modern**, leaning heavily into functional minimalism. It prioritizes a clear information hierarchy over decorative elements. The emotional response is one of stability, professional competence, and organized efficiency. The interface stays out of the way of the user’s primary task—processing information and making informed decisions.

## Colors
The palette is rooted in institutional authority. **Primary Blue (#0078d4)** serves as the main action color for buttons, links, and active states. 

Backgrounds utilize a tiered grayscale:
- **Surface (Primary):** `#ffffff` (White) for cards, panels, and input areas.
- **Background (App):** `#f3f2f1` (Light Gray) to provide contrast for white content modules.
- **Stroke/Borders:** `#edebe9` for subtle containment.

Status indicators follow a strict "Traffic Light" protocol to ensure immediate cognitive recognition of urgency:
- **Green:** On time / Completed.
- **Yellow:** Near deadline / Pending attention.
- **Red:** Overdue / Critical error.
- **Gray:** Closed / Archived / Canceled.

## Typography
This design system utilizes **Inter** as its primary typeface to ensure maximum legibility across high-density data tables and small-label environments. (Note: Segoe UI can be used as a system fallback to maintain a native OS feel).

- **Headlines:** Use Semi-Bold weights to create a strong anchor for section starts.
- **Body Text:** Standardized at 14px for typical interactions to balance density with readability.
- **Labels:** Uppercase is reserved only for very small `label-sm` metadata to prevent visual "shouting."
- **Data:** Numerical data in tables should use tabular lining (monospaced numbers) where possible to facilitate vertical comparison.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy for desktop administration, ensuring that forms and tables do not become unreadably wide on ultrawide monitors.

- **Structure:** A permanent left-hand navigation rail (240px) provides global access. A slim top bar (48px) houses breadcrumbs, search, and profile settings.
- **Content Area:** Uses a 12-column grid. KPI cards typically span 3 columns (4 per row). Data tables span the full 12 columns.
- **Rhythm:** An 8px linear scale (base 4px) governs all margins and padding. 
- **Breakpoints:**
  - **Desktop (1024px+):** Full sidebar visible.
  - **Tablet (768px - 1023px):** Sidebar collapses to icons; margins reduce to 16px.
  - **Mobile (<767px):** Sidebar moves to a "hamburger" drawer; KPI cards stack vertically (1 column).

## Elevation & Depth
Depth is used sparingly to signify interactivity and layering without cluttering the UI. 

- **Tonal Layers:** The primary method of separation. The `#f3f2f1` app background hosts white `#ffffff` cards. 
- **Low-Contrast Outlines:** All cards and input fields use a 1px border (`#edebe9`). 
- **Shadows:** Restricted to "floating" elements like side panels, dropdown menus, and modals. Use a soft, neutral shadow: `0 4px 12px rgba(0, 0, 0, 0.08)`.
- **Side Panels:** When a record is selected for detail viewing, a panel slides in from the right, overlapping the main content with a medium elevation shadow to maintain context of the underlying list.

## Shapes
The shape language is **Soft (0.25rem)**, reflecting a professional but modern aesthetic.

- **Buttons & Inputs:** 4px (0.25rem) corner radius.
- **Cards & Panels:** 8px (0.5rem) corner radius for a slightly softer container feel.
- **Status Indicators:** Status "traffic lights" in tables are perfect circles (50% radius) to distinguish them from interactive buttons.

## Components
- **KPI Cards:** White backgrounds, 8px rounded corners, 1px border. Feature a large `display` number and a small `label-md` trend indicator.
- **Data Tables:** Clean rows with 1px bottom borders. No vertical grid lines. Row hover state uses `#f8f8f8`.
- **Status Indicators:** Small 8px circles located next to text in table cells. Use the defined status colors (Red/Yellow/Green/Gray).
- **Side Navigation:** Dark blue or light gray background. Active items indicated by a 3px vertical "Primary Blue" bar on the left edge.
- **Buttons:**
  - *Primary:* Solid #0078d4 with white text.
  - *Secondary:* 1px #0078d4 border with #0078d4 text.
- **Input Fields:** 1px border (`#8a8886` default, `#0078d4` on focus). Labels sit strictly above the input field using `label-md`.
- **Side Panels:** Full-height containers that slide from the right (400px wide). Includes a header with a "Close" icon and a primary action footer.