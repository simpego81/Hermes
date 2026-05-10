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
 *
 * FEEDBACK008 — Depth-based positioning:
 *   - depth(objective) = 0
 *   - depth(node) = minimum number of connections to reach an objective
 *   - Deeper nodes are placed more to the left
 *   - Objectives with deadlines are positioned by deadline
 *   - Other nodes positioned by (depth, then deadline if available)
 */
export function computeTimelinePositions(
  pages: HermesPage[],
  canvasW: number,
): {
  positions: Map<string, { x: number; type: PageType }>;
  todayX: number | null;
} {
  const PAD = 90;
  const DEPTH_SPACING = 120; // horizontal spacing per depth level

  const objectives = pages.filter((p) => p.type === 'objective');
  const pageByTitle = new Map(pages.map((p) => [p.title, p]));

  // Build reverse link index: target -> sources that link to it
  const reverseLinks = new Map<string, string[]>();
  pages.forEach((p) => {
    p.links.forEach((l) => {
      const target = pageByTitle.get(l);
      if (target) {
        if (!reverseLinks.has(target.id)) reverseLinks.set(target.id, []);
        reverseLinks.get(target.id)!.push(p.id);
      }
    });
  });

  // Compute depth via BFS from all objectives
  // depth(objective) = 0, depth(node pointing to objective) = 1, etc.
  const depth = new Map<string, number>();
  const queue: Array<{ id: string; d: number }> = [];

  // Seed: all objectives start at depth 0
  objectives.forEach((obj) => {
    depth.set(obj.id, 0);
    queue.push({ id: obj.id, d: 0 });
  });

  while (queue.length > 0) {
    const { id, d } = queue.shift()!;
    // Find all pages that link TO this node (i.e., dependencies)
    (reverseLinks.get(id) ?? []).forEach((sourceId) => {
      if (!depth.has(sourceId)) {
        depth.set(sourceId, d + 1);
        queue.push({ id: sourceId, d: d + 1 });
      }
    });
  }

  // Compute deadline-based timeline for objectives
  const withDeadline = pages.filter(
    (p) => (p.type === 'task' || p.type === 'objective') && getDeadlineMs(p) !== null,
  );

  const today = new Date().getTime();
  const times = withDeadline.map((p) => getDeadlineMs(p)!);

  let todayX = 0;
  const xMin = -canvasW / 2 + PAD;
  const xMax = canvasW / 2 - PAD;

  if (times.length > 0) {
    const minT = Math.min(...times, today);
    const maxT = Math.max(...times, today);
    const range = maxT - minT || 1;
    const todayT = (today - minT) / range;
    todayX = xMin + todayT * (xMax - xMin);
  }

  // Position nodes based on depth and deadline
  const positions = new Map<string, { x: number; type: PageType }>();

  // Find max depth for positioning range
  const maxDepth = Math.max(0, ...Array.from(depth.values()));
  const depthRange = maxDepth > 0 ? maxDepth : 1;

  pages.forEach((p) => {
    const nodeDepth = depth.get(p.id);
    const deadline = getDeadlineMs(p);

    if (p.type === 'objective' && deadline !== null) {
      // Objectives with deadlines: position by deadline
      if (times.length > 0) {
        const minT = Math.min(...times, today);
        const maxT = Math.max(...times, today);
        const range = maxT - minT || 1;
        const t = (deadline - minT) / range;
        positions.set(p.id, { x: xMin + t * (xMax - xMin), type: p.type });
      }
    } else if (nodeDepth !== undefined) {
      // Non-objective nodes or objectives without deadline: position by depth
      // Higher depth = more left (reverse the scale)
      const depthFactor = 1 - (nodeDepth / depthRange);

      if (deadline !== null && times.length > 0) {
        // Has deadline: blend depth positioning with deadline
        const minT = Math.min(...times, today);
        const maxT = Math.max(...times, today);
        const range = maxT - minT || 1;
        const t = (deadline - minT) / range;
        const deadlineX = xMin + t * (xMax - xMin);
        // Place to the left of deadline position based on depth
        const x = deadlineX - nodeDepth * DEPTH_SPACING;
        positions.set(p.id, { x: Math.max(xMin, x), type: p.type });
      } else {
        // No deadline: pure depth-based positioning
        const x = xMax - nodeDepth * DEPTH_SPACING;
        positions.set(p.id, { x: Math.max(xMin, x), type: p.type });
      }
    }
  });

  return { positions, todayX: times.length > 0 ? todayX : null };
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
  const LANE_H = 70;  // half-height of each lane (TASK-048: increased from 50 for more vertical space)
  const GAP = 16;     // gap between lanes

  const hw = canvasW / 2 - PAD_X;

  // FEEDBACK008 Req 4-5: Stratificazione verticale con objectives più in alto
  // Offset dall'asse timeline (negativo = sopra l'asse)
  const laneLayout: { type: PageType; offsetFromAxis: number }[] = [
    // Objectives: sopra l'asse per prominenza visiva (moved higher per Req 5)
    { type: 'objective', offsetFromAxis: -(LANE_H + GAP + 24) },
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
