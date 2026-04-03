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
 * Map page ids (task/objective pages with a valid deadline) to an x
 * coordinate along the timeline axis.
 * x ∈ [-canvasW/2 + PAD, canvasW/2 - PAD], sorted oldest → newest.
 */
export function computeTimelinePositions(
  pages: HermesPage[],
  canvasW: number,
): Map<string, number> {
  const PAD = 90;
  const withDeadline = pages
    .filter((p) => (p.type === 'task' || p.type === 'objective') && getDeadlineMs(p) !== null);

  if (withDeadline.length === 0) return new Map();

  const times = withDeadline.map((p) => getDeadlineMs(p)!);
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const range = maxT - minT || 1;

  const xMin = -canvasW / 2 + PAD;
  const xMax = canvasW / 2 - PAD;

  const result = new Map<string, number>();
  withDeadline.forEach((p) => {
    const t = (getDeadlineMs(p)! - minT) / range;
    result.set(p.id, xMin + t * (xMax - xMin));
  });
  return result;
}

/** Return the deadline string for display (null if absent/invalid). */
export function getDeadlineLabel(page: HermesPage): string | null {
  const d = page.metadata.deadline;
  const ds = typeof d === 'string' ? d : d?.[0];
  return ds && ISO_DATE_RE.test(ds) ? ds : null;
}
