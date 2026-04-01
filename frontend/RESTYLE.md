You are restyling the DashShip frontend UI. The reference prototype is in the project root if needed, but the design rules below are the source of truth.

## WHAT TO DO

Scan every .tsx file in src/components and src/pages. Apply these rules to every element you find. Do NOT change any logic, state management, props, or functionality — only change styling (className strings, inline styles, and JSX structure where needed for styling).

## DESIGN RULES — Apply everywhere

### 1. Border radius (MOST IMPORTANT — no sharp corners anywhere)
- ALL cards, containers, panels: `border-radius: 12px` (or Tailwind `rounded-xl`)
- ALL buttons: `border-radius: 10px` (or Tailwind `rounded-[10px]`)
- Chat input bars: `border-radius: 20px`
- Avatars, pills, toggles: `border-radius: 9999px` (full round)
- Small inner elements (badges, type pills, field icons): `border-radius: 4px` to `8px`
- NOTHING should have `rounded-none` or sharp 0px corners

### 2. Border width
- ALL borders should be `0.5px solid` — replace any `border`, `border-b`, `border-t` etc that uses the default 1px
- Use inline style `border: '0.5px solid rgba(0,0,0,0.06)'` for subtle borders
- Use inline style `border: '0.5px solid rgba(0,0,0,0.10)'` for medium borders
- Replace Tailwind `border-ds-border` classes with inline styles where needed for 0.5px

### 3. Shadows (replace borders-as-elevation with shadows)
- Cards and elevated elements: `box-shadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)'`
- Hover/elevated: `box-shadow: '0 4px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)'`

### 4. Fonts
- ALL UI text: `font-family: var(--font-sans)` which is IBM Plex Sans — remove any `font-mono` from body text, labels, nav items
- KEEP `font-mono` ONLY for: field names, formulas, code snippets, data values, file names, the DashShip_ logo text, and micro-labels
- Dashboard rendered content (KPI values, chart titles, axis labels): `font-family: var(--font-dash)` which is Plus Jakarta Sans
- Hero headline on homepage: `font-family: var(--font-display)` which is Instrument Serif

### 5. Colours (use CSS variables)
- Background canvas: `var(--color-ds-bg)` = #FAFAF8
- Surface (cards, panels): `var(--color-ds-surface)` = #FFFFFF
- Inset (field icons, chart backgrounds): `var(--color-ds-surface-alt)` = #F0EFEA
- Primary text: `var(--color-ds-text)` = #0E0D0D
- Secondary text: `var(--color-ds-text-muted)` = #6B6B65
- Tertiary text: `var(--color-ds-text-dim)` = #9E9E96
- Accent: `var(--color-ds-accent)` = #1C3360
- Accent light (backgrounds): `var(--color-ds-accent-light)` = #E8EDF4
- Success: `var(--color-ds-success)` = #3B9B6F
- Error: `var(--color-ds-error)` = #C45454
- Warning/amber: `var(--color-ds-warning)` = #C69026

### 6. Specific component patterns

**Sidebar (src/components/layout/Sidebar.tsx):**
- Background: `var(--color-ds-surface)`
- Border right: `0.5px solid rgba(0,0,0,0.06)`
- Project items: `8px` border-radius, hover background `var(--color-ds-surface-alt)`
- Active project: accent-light background
- "NEW PROJECT" button: `10px` radius
- Bottom section (FREE PLAN): subtle top border `0.5px`

**Data page components (src/components/data/*, src/pages/DataPage.tsx):**
- Schema field rows: `8px` border-radius, hover background
- Field type icons (ABC, #, calendar): `4px` radius box with inset background
- Field badges (dim/meas): `4px` radius, inset background, mono font 9px
- Recommendation cards from Captain: `12px` radius, 0.5px border, shadow-sm
- Approve buttons: accent background, white text, `6px` radius
- Skip buttons: surface background, 0.5px border, `6px` radius

**Plan page sidebar (src/pages/ChatPage.tsx and related):**
- Sidebar sections: clean spacing, 10px uppercase labels with 0.08em tracking
- Sheet items: `8px` radius, 0.5px border, surface background
- Sheet type badges: `4px` radius, inset background, mono font
- Calculated field pills: amber-light background, 0.5px amber border, `8px` radius, mono font
- Generate Dashboard button: full width, `10px` radius, dark background (#0E0D0D), white text

**Build page (src/pages/BuildPage.tsx and src/components/dashboard/*):**
- KPI cards: `8px` radius, surface background, shadow-sm
- KPI values: Plus Jakarta Sans font (var(--font-dash)), 24px, 700 weight
- KPI labels: Plus Jakarta Sans, 11px, tertiary colour
- Change indicators: green for up (↑), red for down (↓)
- Chart cards: `8px` radius, surface background, shadow-sm, `2px solid transparent` border
- Chart card hover: border changes to accent-light
- Chart card selected: border changes to accent
- Desktop/Mobile toggle: pill shape (full radius), shadow-sm

**Publish page (src/components/publish/*, src/pages/PublishPage.tsx if exists):**
- All form inputs: `8px` radius, 0.5px border
- Access level cards: `12px` radius, 0.5px border, SVG icons (not emojis)
- Colour swatches: `6px` radius, 28x28px
- Publish button: `10px` radius, accent background, white text

**Action cards in chat (the "Use sample data" / "Upload my data" boxes):**
- Round these to `12px` radius
- Use 0.5px border
- Add shadow-sm
- Hover: lift with translateY(-1px) and shadow-md

**Wireframe widget (src/components/chat/WireframeWidget.tsx):**
- Container: `12px` radius, 0.5px border, shadow-sm
- KPI placeholders: `8px` radius, inset background
- Chart placeholders: `8px` radius, inset background

**Toast/notification components (src/components/ui/Toast.tsx if exists):**
- `12px` radius
- shadow-md
- 0.5px border

## FILES TO SCAN

Look in these directories:
- src/components/chat/
- src/components/data/
- src/components/dashboard/
- src/components/editor/
- src/components/layout/Sidebar.tsx
- src/components/layout/WorkflowStepper.tsx
- src/components/plan/
- src/components/publish/
- src/components/ui/
- src/pages/DataPage.tsx
- src/pages/ChatPage.tsx
- src/pages/BuildPage.tsx

## RULES

1. Do NOT modify Header.tsx, ProjectNavBar.tsx, ChatInput.tsx, ChatMessage.tsx, or Home.tsx — these are already restyled.
2. Do NOT change any TypeScript logic, props, state, API calls, or imports (except adding icon imports if replacing emojis with SVGs).
3. Do NOT remove any existing functionality.
4. Make every border 0.5px (use inline styles since Tailwind doesn't support 0.5px).
5. Round every sharp corner — scan for any element without border-radius and add appropriate rounding.
6. Replace any emoji icons (🌐, 🔒, ✉️, 📅 etc) with proper SVG icons from src/components/icons/.
7. When in doubt about a value, use the exact numbers from this prompt.

## VERIFICATION

After making changes, confirm:
- No sharp corners visible anywhere in the app
- All borders are subtle (0.5px, not 1px)
- Cards have soft shadows instead of heavy borders
- Font usage is correct (sans for UI, mono for data/code only, dash for dashboard content)
- App still builds with no TypeScript errors
