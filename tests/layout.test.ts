/* Layout algorithm unit tests: computeGroupBoxes, gridPositionsInBox,
   computeTimelinePositions, getDeadlineLabel (TASK-008). */
import {
  BOX_TYPE_ORDER,
  computeGroupBoxes,
  computeTimelinePositions,
  getDeadlineLabel,
  gridPositionsInBox,
} from '../src/lib/layout';
import type { BoxDef } from '../src/lib/layout';
import type { HermesPage } from '../src/lib/types';

// ── Helpers ─────────────────────────────────────────────────────────────────

const CANVAS_W = 1280;
const CANVAS_H = 720;

function makePage(
  id: string,
  type: HermesPage['type'],
  extras: Record<string, string | string[]> = {},
): HermesPage {
  return {
    id,
    title: id,
    type,
    metadata: { type, ...extras },
    body: '',
    links: [],
  };
}

/** Returns true when two boxes do NOT overlap. */
function boxesDisjoint(a: BoxDef, b: BoxDef): boolean {
  return (
    a.cx + a.hw <= b.cx - b.hw ||
    b.cx + b.hw <= a.cx - b.hw ||    // typo-safe
    a.cy + a.hh <= b.cy - b.hh ||
    b.cy + b.hh <= a.cy - a.hh
  );
}

// ── computeGroupBoxes ────────────────────────────────────────────────────────

describe('computeGroupBoxes', () => {
  let boxes: ReturnType<typeof computeGroupBoxes>;

  beforeEach(() => {
    boxes = computeGroupBoxes(CANVAS_W, CANVAS_H);
  });

  it('returns exactly one box per page type (5 boxes)', () => {
    expect(boxes).toHaveLength(5);
  });

  it('assigns types in BOX_TYPE_ORDER order', () => {
    boxes.forEach((box, i) => {
      expect(box.type).toBe(BOX_TYPE_ORDER[i]);
    });
  });

  it('all boxes have positive half-width and half-height', () => {
    boxes.forEach((box) => {
      expect(box.hw).toBeGreaterThan(0);
      expect(box.hh).toBeGreaterThan(0);
    });
  });

  it('all box centers are within canvas bounds', () => {
    boxes.forEach((box) => {
      expect(box.cx).toBeGreaterThan(-CANVAS_W / 2);
      expect(box.cx).toBeLessThan(CANVAS_W / 2);
      expect(box.cy).toBeGreaterThan(-CANVAS_H / 2);
      expect(box.cy).toBeLessThan(CANVAS_H / 2);
    });
  });

  it('all boxes fit within the canvas (no edges exceed bounds)', () => {
    boxes.forEach((box) => {
      expect(box.cx - box.hw).toBeGreaterThanOrEqual(-CANVAS_W / 2 - 1);
      expect(box.cx + box.hw).toBeLessThanOrEqual(CANVAS_W / 2 + 1);
      expect(box.cy - box.hh).toBeGreaterThanOrEqual(-CANVAS_H / 2 - 1);
      expect(box.cy + box.hh).toBeLessThanOrEqual(CANVAS_H / 2 + 1);
    });
  });

  it('no two boxes overlap', () => {
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        expect(boxesDisjoint(boxes[i], boxes[j])).toBe(true);
      }
    }
  });

  it('boxes cover a large portion of the canvas area (>= 70%)', () => {
    const totalBoxArea = boxes.reduce((sum, b) => sum + b.hw * 2 * b.hh * 2, 0);
    const canvasArea = CANVAS_W * CANVAS_H;
    expect(totalBoxArea / canvasArea).toBeGreaterThanOrEqual(0.7);
  });

  it('is stable: calling twice with same args produces identical results', () => {
    const b1 = computeGroupBoxes(CANVAS_W, CANVAS_H);
    const b2 = computeGroupBoxes(CANVAS_W, CANVAS_H);
    expect(b1).toEqual(b2);
  });

  it('scales correctly to a different canvas size', () => {
    const wide = computeGroupBoxes(2560, 1440);
    wide.forEach((box) => {
      expect(box.hw).toBeGreaterThan(0);
      expect(box.hh).toBeGreaterThan(0);
    });
    // Wide boxes should be wider than standard ones
    const std = computeGroupBoxes(CANVAS_W, CANVAS_H);
    wide.forEach((b, i) => expect(b.hw).toBeGreaterThan(std[i].hw));
  });
});

// ── gridPositionsInBox ────────────────────────────────────────────────────────

describe('gridPositionsInBox', () => {
  const box: BoxDef = { type: 'task', cx: 0, cy: 0, hw: 200, hh: 150 };

  it('returns an empty map for empty nodeIds', () => {
    const result = gridPositionsInBox([], new Map(), box);
    expect(result.size).toBe(0);
  });

  it('places every node id into the result map', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const vals = new Map(ids.map((id, i) => [id, 10 - i]));
    const result = gridPositionsInBox(ids, vals, box);
    expect(result.size).toBe(ids.length);
    ids.forEach((id) => expect(result.has(id)).toBe(true));
  });

  it('all positions are within box bounds (minus MARGIN=22)', () => {
    const MARGIN = 22;
    const ids = Array.from({ length: 20 }, (_, i) => `n${i}`);
    const vals = new Map(ids.map((id, i) => [id, i]));
    const result = gridPositionsInBox(ids, vals, box);
    result.forEach(({ x, y }) => {
      expect(x).toBeGreaterThanOrEqual(box.cx - box.hw + MARGIN - 0.001);
      expect(x).toBeLessThanOrEqual(box.cx + box.hw - MARGIN + 0.001);
      expect(y).toBeGreaterThanOrEqual(box.cy - box.hh + MARGIN - 0.001);
      expect(y).toBeLessThanOrEqual(box.cy + box.hh - MARGIN + 0.001);
    });
  });

  it('the highest-val node gets the top-left position (min x and min y)', () => {
    const ids = ['low', 'mid', 'high'];
    const vals = new Map<string, number>([['low', 1], ['mid', 5], ['high', 10]]);
    const result = gridPositionsInBox(ids, vals, box);
    const highPos = result.get('high')!;
    const lowPos  = result.get('low')!;
    const midPos  = result.get('mid')!;
    // high should be at grid index 0 (top-left), low and mid after
    expect(highPos.x).toBeLessThanOrEqual(midPos.x + 0.001);
    expect(highPos.y).toBeLessThanOrEqual(lowPos.y + 0.001);
  });

  it('single node is placed at center of box (minus margin)', () => {
    const result = gridPositionsInBox(['only'], new Map([['only', 5]]), box);
    const pos = result.get('only')!;
    // With 1 node: cols=1, rows=1, cell covers entire inner area
    expect(pos.x).toBeCloseTo(box.cx, 0);
    expect(pos.y).toBeCloseTo(box.cy, 0);
  });

  it('nodes with equal val are all still placed (no collisions in output)', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const vals = new Map(ids.map((id) => [id, 7])); // all same
    const result = gridPositionsInBox(ids, vals, box);
    const positions = [...result.values()];
    const posStrings = positions.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`);
    const unique = new Set(posStrings);
    expect(unique.size).toBe(ids.length);
  });
});

// ── computeTimelinePositions ──────────────────────────────────────────────────

describe('computeTimelinePositions', () => {
  const PAD = 90;
  const xMin = -CANVAS_W / 2 + PAD;
  const xMax = CANVAS_W / 2 - PAD;

  it('returns empty map when no pages have deadlines', () => {
    const pages = [
      makePage('A', 'task'),
      makePage('B', 'persona', { deadline: '2026-06-01' }),  // persona excluded
      makePage('C', 'component'),
    ];
    expect(computeTimelinePositions(pages, CANVAS_W).size).toBe(0);
  });

  it('excludes persona, component, and note pages even with a deadline', () => {
    const pages = [
      makePage('P1', 'persona', { deadline: '2026-01-01' }),
      makePage('C1', 'component', { deadline: '2026-01-01' }),
      makePage('N1', 'note', { deadline: '2026-01-01' }),
    ];
    expect(computeTimelinePositions(pages, CANVAS_W).size).toBe(0);
  });

  it('includes task and objective pages with valid deadlines', () => {
    const pages = [
      makePage('T1', 'task', { deadline: '2026-06-01' }),
      makePage('O1', 'objective', { deadline: '2026-09-01' }),
    ];
    const result = computeTimelinePositions(pages, CANVAS_W);
    expect(result.has('T1')).toBe(true);
    expect(result.has('O1')).toBe(true);
  });

  it('oldest deadline maps to xMin, newest to xMax', () => {
    const pages = [
      makePage('early', 'task', { deadline: '2025-01-01' }),
      makePage('late', 'task', { deadline: '2027-12-31' }),
    ];
    const result = computeTimelinePositions(pages, CANVAS_W);
    expect(result.get('early')).toBeCloseTo(xMin, 3);
    expect(result.get('late')).toBeCloseTo(xMax, 3);
  });

  it('all x values fall within [xMin, xMax]', () => {
    const pages = [
      makePage('T1', 'task', { deadline: '2026-01-01' }),
      makePage('T2', 'task', { deadline: '2026-06-15' }),
      makePage('T3', 'objective', { deadline: '2026-12-01' }),
      makePage('T4', 'task', { deadline: '2026-03-20' }),
    ];
    const result = computeTimelinePositions(pages, CANVAS_W);
    result.forEach((x) => {
      expect(x).toBeGreaterThanOrEqual(xMin - 0.001);
      expect(x).toBeLessThanOrEqual(xMax + 0.001);
    });
  });

  it('a single deadline maps to xMin (range = 1, t = 0)', () => {
    const pages = [makePage('only', 'task', { deadline: '2026-06-01' })];
    const result = computeTimelinePositions(pages, CANVAS_W);
    expect(result.get('only')).toBeCloseTo(xMin, 3);
  });

  it('two identical deadlines are placed at the same x coordinate', () => {
    const pages = [
      makePage('T1', 'task', { deadline: '2026-06-01' }),
      makePage('T2', 'objective', { deadline: '2026-06-01' }),
    ];
    const result = computeTimelinePositions(pages, CANVAS_W);
    // both have t=0 → both at xMin
    expect(result.get('T1')).toBeCloseTo(xMin, 3);
    expect(result.get('T2')).toBeCloseTo(xMin, 3);
  });

  it('excludes task pages with an invalid deadline format', () => {
    const pages = [
      makePage('bad', 'task', { deadline: '01/06/2026' }),
      makePage('good', 'task', { deadline: '2026-06-01' }),
    ];
    const result = computeTimelinePositions(pages, CANVAS_W);
    expect(result.has('bad')).toBe(false);
    expect(result.has('good')).toBe(true);
  });

  it('x positions are monotonically ordered by deadline date', () => {
    const pages = [
      makePage('T1', 'task', { deadline: '2026-03-01' }),
      makePage('T2', 'task', { deadline: '2026-06-01' }),
      makePage('T3', 'task', { deadline: '2026-12-01' }),
    ];
    const result = computeTimelinePositions(pages, CANVAS_W);
    const x1 = result.get('T1')!;
    const x2 = result.get('T2')!;
    const x3 = result.get('T3')!;
    expect(x1).toBeLessThan(x2);
    expect(x2).toBeLessThan(x3);
  });
});

// ── getDeadlineLabel ──────────────────────────────────────────────────────────

describe('getDeadlineLabel', () => {
  it('returns the date string for a valid ISO-8601 deadline', () => {
    const page = makePage('p', 'task', { deadline: '2026-06-15' });
    expect(getDeadlineLabel(page)).toBe('2026-06-15');
  });

  it('returns null when deadline is missing', () => {
    const page = makePage('p', 'task');
    expect(getDeadlineLabel(page)).toBeNull();
  });

  it('returns null for a non-ISO date format', () => {
    const page = makePage('p', 'task', { deadline: '15/06/2026' });
    expect(getDeadlineLabel(page)).toBeNull();
  });

  it('returns null for an invalid date string', () => {
    const page = makePage('p', 'task', { deadline: 'next-monday' });
    expect(getDeadlineLabel(page)).toBeNull();
  });

  it('handles array deadline values (reads first element)', () => {
    const page = makePage('p', 'task');
    page.metadata.deadline = ['2026-08-01'];
    expect(getDeadlineLabel(page)).toBe('2026-08-01');
  });
});
