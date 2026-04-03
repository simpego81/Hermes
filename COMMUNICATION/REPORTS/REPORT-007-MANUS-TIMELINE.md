# REPORT-007-MANUS-TIMELINE

**Agent:** Manus (R&D)  
**Task ref:** TASK-007-MANUS-TIMELINE  
**Status:** ✅ COMPLETED  
**Date:** 2026-04-02  

---

## Summary

Implemented the "Timeline View" layout mode: task and objective nodes that carry a valid `deadline` metadata field are pinned along a horizontal time axis at the top of the canvas, sorted oldest → newest. Nodes without a deadline float freely in a lower "No Deadline" zone maintained by a zone-bias d3 force.

---

## Deliverables

### Modified files (TASK-007 additions on top of TASK-006 shared infrastructure)

| File | Changes |
|---|---|
| `src/lib/layout.ts` | `computeTimelinePositions(pages, canvasW)` — filters task/objective pages with a valid ISO deadline, maps them to x ∈ `[-W/2+PAD, W/2-PAD]` proportionally by date (oldest left, newest right); `getDeadlineLabel()` helper for canvas text rendering |
| `src/components/Graph.tsx` | `layoutMode === 'timeline'` branch in the layout `useEffect`: pins deadline nodes via `node.fx`/`node.fy` = computed x / `−H×0.28`; pushes free nodes to `y ≥ H×0.14` with a zone d3 force; `onRenderFramePre` draws a horizontal axis with arrow head, "TIMELINE" label, per-node tick marks with date strings, a dashed separator, and a "NO DEADLINE" zone label |
| `src/components/Toolbar.tsx` | "⏱ Timeline View" button wired to `'timeline'` mode toggle |

---

## Algorithm

```
Timeline x-positions (deadline nodes only):
  minT = min(deadlines), maxT = max(deadlines)
  t    = (deadline − minT) / (maxT − minT)   [0…1]
  x    = xMin + t × (xMax − xMin)            [graph space]

Node pinning:
  deadline node → node.fx = x, node.fy = −H × 0.28   (fixed)
  free node     → node.y  = max(H × 0.14, node.y)     (initial bias)

Zone force (non-pinned nodes):
  if y < FREE_Y_BIAS:  vy += (FREE_Y_BIAS − y) × 0.18 × alpha
```

Canvas overlay (drawn via `onRenderFramePre` before nodes):
- Horizontal axis line with arrow head
- Per-deadline node: vertical tick + date label below axis
- Dashed separator between timeline zone and free zone
- "TIMELINE" and "NO DEADLINE" zone labels (all scale-compensated)

---

## Data handling

- Nodes without a `deadline` field (all persona, component, note pages, and task/objective pages missing the field) are **not pinned** — they form a cluster in the lower half of the canvas.
- Deadline values must match `YYYY-MM-DD` (ISO 8601); non-conforming values are silently treated as "no deadline" (same fallback rule as schema validation).
- When only one unique deadline date exists, all deadline nodes are placed at `x = xMin` (centre of range).

---

## Quality gates

| Gate | Result |
|---|---|
| `tsc --noEmit` (renderer) | ✅ 0 errors |
| ESLint | ✅ 0 errors |
| Jest 37 tests | ✅ 37/37 passing |
| `vite build` | ✅ Built in 2.56 s |
