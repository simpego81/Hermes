/* Hermes layout algorithms: grouped-box and timeline positioning. */
import type { HermesPage, PageType } from './types';

export type LayoutMode = 'free' | 'grouped' | 'timeline';

/** Order in which category boxes are placed (row-major, 3 cols). */
export const BOX_TYPE_ORDER: PageType[] = [
  'task',
  'objective',
  'persona',
  'component',
  'note',
];

export interface BoxDef {
  type: PageType;
  cx: number; // center x in graph-space coords (0,0 = canvas center)
  cy: number; // center y
  hw: number; // half-width
  hh: number; // half-height
}

/**
 * Compute 5 non-overlapping category boxes that tile the canvas.
 * Coordinates are in graph space: x ∈ [-W/2, W/2], y ∈ [-H/2, H/2].
 */
export function computeGroupBoxes(canvasW: number, canvasH: number): BoxDef[] {
  const COLS = 3;
  const ROWS = 2;
  const OUTER = 28; // padding from canvas edge
  const GAP = 14;   // gap between boxes

  const boxW = (canvasW - OUTER * 2 - GAP * (COLS - 1)) / COLS;
  const boxH = (canvasH - OUTER * 2 - GAP * (ROWS - 1)) / ROWS;

  return BOX_TYPE_ORDER.map((type, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const left = -canvasW / 2 + OUTER + col * (boxW + GAP);
    const top  = -canvasH / 2 + OUTER + row * (boxH + GAP);
    return {
      type,
      cx: left + boxW / 2,
      cy: top  + boxH / 2,
      hw: boxW / 2,
      hh: boxH / 2,
    };
  });
}

/**
 * For each node in a box, compute an initial grid position sorted by
 * importance (val) descending — most important goes top-left.
 */
export function gridPositionsInBox(
  nodeIds: string[],
  vals: Map<string, number>,
  box: BoxDef,
): Map<string, { x: number; y: number }> {
  const MARGIN = 22;
  const sorted = [...nodeIds].sort((a, b) => (vals.get(b) ?? 0) - (vals.get(a) ?? 0));
  const count = sorted.length;
  if (count === 0) return new Map();

  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.ceil(count / cols);
  const innerW = box.hw * 2 - MARGIN * 2;
  const innerH = box.hh * 2 - MARGIN * 2;
  const cellW = innerW / cols;
  const cellH = innerH / rows;

  const result = new Map<string, { x: number; y: number }>();
  sorted.forEach((id, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    result.set(id, {
      x: box.cx - box.hw + MARGIN + col * cellW + cellW / 2,
      y: box.cy - box.hh + MARGIN + row * cellH + cellH / 2,
    });
  });
  return result;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function getDeadlineMs(page: HermesPage): number | null {
  const d = page.metadata.deadline;
  const ds = typeof d === 'string' ? d : d?.[0];
  if (!ds || !ISO_DATE_RE.test(ds)) return null;
  return new Date(ds).getTime();
}

/**
 * Map page ids to an x coordinate along the timeline axis.
 * Includes "todayX" marker position.
 * Implements "left of objective" constraint: items pointing to objectives (directly or not)
 * must be on the left of the objective.
 */
export function computeTimelinePositions(
  pages: HermesPage[],
  canvasW: number,
): {
  positions: Map<string, { x: number; type: PageType }>;
  todayX: number | null;
} {
  const PAD = 90;
  const withDeadline = pages.filter(
    (p) => (p.type === 'task' || p.type === 'objective') && getDeadlineMs(p) !== null,
  );

  const today = new Date().getTime();
  const times = withDeadline.map((p) => getDeadlineMs(p)!);
  if (times.length === 0) {
    return { positions: new Map(), todayX: 0 };
  }

  const minT = Math.min(...times, today);
  const maxT = Math.max(...times, today);
  const range = maxT - minT || 1;

  const xMin = -canvasW / 2 + PAD;
  const xMax = canvasW / 2 - PAD;

  const positions = new Map<string, { x: number; type: PageType }>();

  // Initial positions based on deadlines
  withDeadline.forEach((p) => {
    const t = (getDeadlineMs(p)! - minT) / range;
    positions.set(p.id, { x: xMin + t * (xMax - xMin), type: p.type });
  });

  const todayT = (today - minT) / range;
  const todayX = xMin + todayT * (xMax - xMin);

  // Implement "left of objective" constraint
  const objectives = pages.filter((p) => p.type === 'objective');
  const pageByTitle = new Map(pages.map((p) => [p.title, p]));

  // Iterative BFS to propagate "left of objective" constraints.
  // Avoids stack overflow on circular link graphs via a visited set.
  const minXConstraint = new Map<string, number>();

  objectives.forEach((obj) => {
    const pos = positions.get(obj.id);
    if (!pos) return;

    const queue: Array<{ id: string; maxX: number }> = [{ id: obj.id, maxX: pos.x }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { id: pageId, maxX } = queue.shift()!;
      if (visited.has(pageId)) continue;
      const current = minXConstraint.get(pageId) ?? Infinity;
      if (maxX >= current) continue; // no improvement
      minXConstraint.set(pageId, maxX);
      visited.add(pageId);
      // Enqueue pages that link to this page
      pages.forEach((p) => {
        if (!visited.has(p.id) && p.links.some((l) => pageByTitle.get(l)?.id === pageId)) {
          queue.push({ id: p.id, maxX: maxX - 40 });
        }
      });
    }
  });

  // Apply constraints to positions
  minXConstraint.forEach((maxX, id) => {
    const entry = positions.get(id);
    const page = pages.find((p) => p.id === id);
    if (entry) {
      if (entry.x >= maxX) {
        entry.x = maxX - 10;
      }
    } else if (page) {
      // Node has no deadline but points to an objective: place it on timeline
      positions.set(id, { x: maxX - 20, type: page.type });
    }
  });

  return { positions, todayX };
}

export interface TimelineLane {
  type: PageType;
  cx: number;
  cy: number;
  hw: number;
  hh: number;
}

/**
 * Compute horizontal "swim lanes" for the timeline view.
 *
 * FEEDBACK008 — Stratificazione verticale: Obj > Task > Others
 *   - Objectives: sopra l'asse della timeline (prominenza visiva)
 *   - Tasks: appena sotto l'asse
 *   - Persona, Component, Note: sezione inferiore, in ordine
 *
 * Tutti i tipi sono inclusi per consentire il posizionamento corretto
 * quando il filtro di categoria è attivo.
 */
export function computeTimelineLanes(
  canvasW: number,
  canvasH: number,
  timelineY: number,
): TimelineLane[] {
  const PAD_X = 50;
  const LANE_H = 50;  // half-height of each lane
  const GAP = 16;     // gap between lanes

  const hw = canvasW / 2 - PAD_X;

  // Stratificazione: offset dall'asse (negativo = sopra l'asse)
  const laneLayout: { type: PageType; offsetFromAxis: number }[] = [
    // Objectives: sopra l'asse per prominenza visiva
    { type: 'objective', offsetFromAxis: -(LANE_H + GAP + 8) },
    // Tasks: appena sotto l'asse
    { type: 'task',      offsetFromAxis: LANE_H + GAP },
    // Persona: sotto i task
    { type: 'persona',   offsetFromAxis: LANE_H * 3 + GAP * 2 + 8 },
    // Component: sotto persona
    { type: 'component', offsetFromAxis: LANE_H * 5 + GAP * 3 + 8 },
    // Note: in fondo
    { type: 'note',      offsetFromAxis: LANE_H * 7 + GAP * 4 + 8 },
  ];

  return laneLayout.map(({ type, offsetFromAxis }) => ({
    type,
    cx: 0,
    cy: timelineY + offsetFromAxis,
    hw,
    hh: LANE_H,
  }));
}

/** Return the deadline string for display (null if absent/invalid). */
export function getDeadlineLabel(page: HermesPage): string | null {
  const d = page.metadata.deadline;
  const ds = typeof d === 'string' ? d : d?.[0];
  return ds && ISO_DATE_RE.test(ds) ? ds : null;
}
