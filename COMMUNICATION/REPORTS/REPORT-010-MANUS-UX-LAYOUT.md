# REPORT-010-MANUS-UX-LAYOUT

**Agent:** Manus (eseguito da Copilot)  
**Task ref:** TASK-010-MANUS-UX-LAYOUT  
**Status:** ✅ COMPLETED  
**Date:** 2026-04-03  

---

## Summary

Redesigned the application layout from a two-panel (Sidebar + Graph) arrangement into a three-panel split-view: **Sidebar** (file explorer, left) → **Editor** (center, takes primary focus) → **Graph + Inspector** (right, collapsible). Added breadcrumb navigation with back-history, and bi-directional Graph↔Editor navigation.

---

## Deliverables

### New files

| File | Description |
|---|---|
| `src/components/Breadcrumbs.tsx` | Navigation breadcrumb bar showing visited-page history (up to 6 entries), back button, truncation ellipsis. Color-coded active item by page type. |

### Modified files

| File | Changes |
|---|---|
| `src/App.tsx` | Complete rewrite of the application shell: split-view layout, `navHistory` state, `selectPage` / `breadcrumbNavigate` / `goBack` callbacks, `showGraph` toggle, `editorContent` memo, `handleEditorChange` for metadata sync + auto-save. |
| `src/styles.css` | Added `.editor-area`, `.editor-topbar`, `.toggle-graph-btn`, `.graph-panel`, `.editor-container`, `.editor-placeholder`, `.breadcrumbs`, `.breadcrumb-back`, `.breadcrumb-item`, `.breadcrumb-sep` and related CSS. Removed fixed `height: 100vh` from `.inspector` for panel flexibility. |

---

## Feature details

### 1. Split-View Layout

```
┌──────────┬────────────────────────┬──────────────────┐
│ Sidebar  │      Editor Area       │   Graph Panel    │
│ (260px)  │ ┌────────────────────┐ │ ┌──────────────┐ │
│          │ │ Breadcrumbs  [Hide]│ │ │   Toolbar    │ │
│ - Search │ ├────────────────────┤ │ ├──────────────┤ │
│ - Groups │ │                    │ │ │              │ │
│ - Pages  │ │  CodeMirror 6      │ │ │  ForceGraph  │ │
│          │ │  Markdown Editor   │ │ │              │ │
│          │ │                    │ │ ├──────────────┤ │
│          │ │                    │ │ │  Inspector   │ │
│          │ └────────────────────┘ │ └──────────────┘ │
└──────────┴────────────────────────┴──────────────────┘
```

- **Editor area** uses `flex: 1` so it fills all remaining horizontal space.
- **Graph panel** is 480 px wide (min 320 px, max 50 vw), collapsible via the "◩ Hide Graph / ◧ Show Graph" toggle button in the editor top bar.
- When the graph panel is hidden, the editor expands to fill the full width.

### 2. Graph → Editor Navigation

Clicking a node in the force-graph calls `selectPage(id)` which:
1. Sets `selectedId`, causing the Editor to load the page's markdown content.
2. Pushes the page onto `navHistory` (avoiding consecutive duplicates).
3. The Inspector panel updates simultaneously to show metadata.

### 3. Editor → Graph Navigation

When the user edits frontmatter (e.g., adds a `[[wiki-link]]`), the metadata-sync callback re-parses the page and updates `pages` state. `buildGraphData` recomputes, and the force graph re-renders with updated links — providing real-time visual feedback.

### 4. Breadcrumbs & History

- The `Breadcrumbs` component renders the last 6 entries from `navHistory`.
- A "←" back button pops the most recent entry and navigates to the previous one.
- Clicking any breadcrumb item navigates to that point in history (truncating forward history).
- History push is suppressed during breadcrumb/back navigation to prevent duplication.
- The active (current) breadcrumb is color-coded by page type.

### 5. UI Polishing

- Seamless transitions: CSS `transition` on all interactive elements (buttons, breadcrumbs, toggles).
- Dark-theme consistency: editor, breadcrumbs, and toggle button follow the existing `--sidebar-bg`, `--canvas-bg`, `--accent` color scheme.
- Graph panel Inspector is height-capped at 260 px with overflow auto for dense metadata.
- Editor placeholder ("Select a page to start editing") shown when no page is selected.

---

## Quality gates

| Check | Result |
|---|---|
| `tsc --noEmit -p tsconfig.app.json` | ✅ No errors |
| `tsc --noEmit -p tsconfig.electron.json` | ✅ No errors |
| `tsc --noEmit -p tsconfig.preload.json` | ✅ No errors |
| ESLint | ✅ 0 errors, 0 warnings |
| Jest (99 tests / 6 suites) | ✅ All pass |
| Electron main.js + preload.js build | ✅ Compiled to `dist-electron/` |
