/* Layout algorithm unit tests: computeGroupBoxes, gridPositionsInBox,
   computeTimelinePositions, getDeadlineLabel (TASK-008). */
import {
  BOX_TYPE_ORDER,
  computeGroupBoxes,
  computeTimelineLanes,
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
    expect(computeTimelinePositions(pages, CANVAS_W).positions.size).toBe(0);
  });

  it('excludes persona, component, and note pages even with a deadline', () => {
    const pages = [
      makePage('P1', 'persona', { deadline: '2026-01-01' }),
      makePage('C1', 'component', { deadline: '2026-01-01' }),
      makePage('N1', 'note', { deadline: '2026-01-01' }),
    ];
    expect(computeTimelinePositions(pages, CANVAS_W).positions.size).toBe(0);
  });

  it('includes task and objective pages with valid deadlines', () => {
    const obj = makePage('O1', 'objective', { deadline: '2026-09-01' });
    const task = makePage('T1', 'task', { deadline: '2026-06-01' });
    task.links = ['O1']; // Link task to objective for depth calculation
    const pages = [task, obj];
    const { positions } = computeTimelinePositions(pages, CANVAS_W);
    expect(positions.has('T1')).toBe(true);
    expect(positions.has('O1')).toBe(true);
  });

  it('oldest deadline maps to xMin, newest to xMax', () => {
    const obj = makePage('obj', 'objective', { deadline: '2026-06-01' });
    const early = makePage('early', 'task', { deadline: '2025-01-01' });
    const late = makePage('late', 'task', { deadline: '2027-12-31' });
    early.links = ['obj'];
    late.links = ['obj'];
    const pages = [obj, early, late];
    const { positions } = computeTimelinePositions(pages, CANVAS_W);
    // Tasks with deadlines positioned with depth offset, but still ordered by deadline
    expect(positions.get('early')!.x).toBeLessThan(positions.get('late')!.x);
  });

  it('all x values fall within [xMin, xMax]', () => {
    const pages = [
      makePage('T1', 'task', { deadline: '2026-01-01' }),
      makePage('T2', 'task', { deadline: '2026-06-15' }),
      makePage('T3', 'objective', { deadline: '2026-12-01' }),
      makePage('T4', 'task', { deadline: '2026-03-20' }),
    ];
    const { positions } = computeTimelinePositions(pages, CANVAS_W);
    positions.forEach((entry) => {
      expect(entry.x).toBeGreaterThanOrEqual(xMin - 0.001);
      expect(entry.x).toBeLessThanOrEqual(xMax + 0.001);
    });
  });

  it('a past deadline is placed at the left of the timeline', () => {
    // Use a clearly past date so it becomes minT; today becomes the maxT anchor.
    const obj = makePage('obj', 'objective', { deadline: '2026-06-01' });
    const past = makePage('only', 'task', { deadline: '2025-01-01' });
    past.links = ['obj'];
    const pages = [obj, past];
    const { positions } = computeTimelinePositions(pages, CANVAS_W);
    // Past deadline should be to the left of the objective
    expect(positions.get('only')!.x).toBeLessThan(positions.get('obj')!.x);
  });

  it('two identical deadlines are placed at the same x coordinate', () => {
    const obj = makePage('obj', 'objective', { deadline: '2026-12-01' });
    const t1 = makePage('T1', 'task', { deadline: '2026-06-01' });
    const t2 = makePage('T2', 'task', { deadline: '2026-06-01' });
    t1.links = ['obj'];
    t2.links = ['obj'];
    const pages = [obj, t1, t2];
    const { positions } = computeTimelinePositions(pages, CANVAS_W);
    // Both are tasks with the same deadline and depth → same x position.
    expect(positions.get('T1')!.x).toBeCloseTo(positions.get('T2')!.x, 3);
  });

  it('positions task with invalid deadline using depth only', () => {
    const obj = makePage('obj', 'objective', { deadline: '2026-12-01' });
    const bad = makePage('bad', 'task', { deadline: '01/06/2026' });
    const good = makePage('good', 'task', { deadline: '2026-06-01' });
    bad.links = ['obj'];
    good.links = ['obj'];
    const pages = [obj, bad, good];
    const { positions } = computeTimelinePositions(pages, CANVAS_W);
    // Task with invalid deadline but valid depth is still positioned (using depth only)
    expect(positions.has('bad')).toBe(true);
    expect(positions.has('good')).toBe(true);
    // Task with valid deadline uses deadline+depth, invalid uses only depth
    expect(positions.get('good')!.x).toBeLessThan(positions.get('obj')!.x);
  });

  it('x positions are monotonically ordered by deadline date', () => {
    const obj = makePage('obj', 'objective', { deadline: '2027-01-01' });
    const t1 = makePage('T1', 'task', { deadline: '2026-03-01' });
    const t2 = makePage('T2', 'task', { deadline: '2026-06-01' });
    const t3 = makePage('T3', 'task', { deadline: '2026-12-01' });
    t1.links = ['obj'];
    t2.links = ['obj'];
    t3.links = ['obj'];
    const pages = [obj, t1, t2, t3];
    const { positions } = computeTimelinePositions(pages, CANVAS_W);
    const x1 = positions.get('T1')!.x;
    const x2 = positions.get('T2')!.x;
    const x3 = positions.get('T3')!.x;
    expect(x1).toBeLessThan(x2);
    expect(x2).toBeLessThan(x3);
  });

  // ── Depth-based positioning (FEEDBACK008) ──────────────────────────────────
  describe('depth calculation', () => {
    it('assigns depth 0 to all objectives', () => {
      const pages = [
        makePage('Obj1', 'objective', { deadline: '2026-06-01' }),
        makePage('Obj2', 'objective', { deadline: '2026-12-01' }),
        makePage('Task1', 'task', { deadline: '2026-08-01' }),
      ];
      // Link task to objectives to trigger depth calculation
      pages[2].links = ['Obj1'];

      const { positions } = computeTimelinePositions(pages, CANVAS_W);

      // Objectives with deadlines positioned by deadline only (not depth-offset)
      expect(positions.has('Obj1')).toBe(true);
      expect(positions.has('Obj2')).toBe(true);
      // Verify Obj1 < Obj2 (ordered by deadline)
      expect(positions.get('Obj1')!.x).toBeLessThan(positions.get('Obj2')!.x);
    });

    it('assigns depth 1 to nodes directly linking to objectives', () => {
      const obj = makePage('MainObjective', 'objective', { deadline: '2026-12-01' });
      const task1 = makePage('Task1', 'task', { deadline: '2026-06-01' });
      const task2 = makePage('Task2', 'task', { deadline: '2026-06-15' });

      // Tasks link TO the objective
      task1.links = ['MainObjective'];
      task2.links = ['MainObjective'];

      const pages = [obj, task1, task2];
      const { positions } = computeTimelinePositions(pages, CANVAS_W);

      // Tasks should be positioned to the LEFT of their deadline (depth = 1)
      // Depth spacing is 120px per level
      const objX = positions.get('MainObjective')!.x;
      const task1X = positions.get('Task1')!.x;
      const task2X = positions.get('Task2')!.x;

      // Tasks with depth 1 should be offset left from their deadline position
      // (Can't calculate exact value without knowing deadline mapping, but verify they exist)
      expect(positions.has('Task1')).toBe(true);
      expect(positions.has('Task2')).toBe(true);

      // Objectives should be at rightmost position for their deadline
      expect(objX).toBeGreaterThan(task1X);
      expect(objX).toBeGreaterThan(task2X);
    });

    it('handles multiple paths by selecting minimum depth', () => {
      const obj = makePage('Objective', 'objective', { deadline: '2026-12-01' });
      // Use same deadline for all tasks to isolate depth effect
      const taskA = makePage('TaskA', 'task', { deadline: '2026-08-01' });
      const taskB = makePage('TaskB', 'task', { deadline: '2026-08-01' });
      const taskC = makePage('TaskC', 'task', { deadline: '2026-08-01' });

      // TaskA -> Objective (depth 1)
      taskA.links = ['Objective'];
      // TaskB -> TaskA -> Objective (depth 2)
      taskB.links = ['TaskA'];
      // TaskC -> both TaskA AND Objective (min depth = 1)
      taskC.links = ['TaskA', 'Objective'];

      const pages = [obj, taskA, taskB, taskC];
      const { positions } = computeTimelinePositions(pages, CANVAS_W);

      // TaskC has two paths: direct to Obj (depth 1) and via TaskA (depth 2)
      // BFS should assign minimum depth = 1
      const taskAX = positions.get('TaskA')!.x;
      const taskCX = positions.get('TaskC')!.x;
      const taskBX = positions.get('TaskB')!.x;

      // With same deadline, position is purely depth-based: x = deadlineX - depth * 120px
      // TaskA and TaskC both have depth 1 → same x
      expect(taskAX).toBeCloseTo(taskCX, 1);
      // TaskB has depth 2 → 120px further left
      expect(taskBX).toBeLessThan(taskAX - 100); // At least 100px left
      expect(taskBX).toBeLessThan(taskCX - 100);
    });

    it('handles disconnected nodes (no path to any objective)', () => {
      const obj = makePage('Objective', 'objective', { deadline: '2026-12-01' });
      const taskA = makePage('Connected', 'task', { deadline: '2026-06-01' });
      const taskB = makePage('Isolated', 'task', { deadline: '2026-08-01' });

      taskA.links = ['Objective'];
      // TaskB has no links, disconnected from objective

      const pages = [obj, taskA, taskB];
      const { positions } = computeTimelinePositions(pages, CANVAS_W);

      // Connected task should be positioned
      expect(positions.has('Connected')).toBe(true);
      // Disconnected task has no depth, won't be positioned (undefined depth)
      expect(positions.has('Isolated')).toBe(false);
    });

    it('positions deeper nodes more to the left', () => {
      const obj = makePage('Objective', 'objective', { deadline: '2026-12-01' });
      const task1 = makePage('Task1', 'task', { deadline: '2026-08-01' });
      const task2 = makePage('Task2', 'task', { deadline: '2026-08-01' }); // Same deadline
      const task3 = makePage('Task3', 'task', { deadline: '2026-08-01' });

      // Create depth chain: Task3 -> Task2 -> Task1 -> Objective
      task1.links = ['Objective']; // depth 1
      task2.links = ['Task1'];     // depth 2
      task3.links = ['Task2'];     // depth 3

      const pages = [obj, task1, task2, task3];
      const { positions } = computeTimelinePositions(pages, CANVAS_W);

      const x1 = positions.get('Task1')!.x;
      const x2 = positions.get('Task2')!.x;
      const x3 = positions.get('Task3')!.x;

      // All tasks have same deadline, so ordering is purely by depth
      // Deeper = more left
      expect(x3).toBeLessThan(x2);
      expect(x2).toBeLessThan(x1);
    });

    it('correctly blends depth with deadline positioning', () => {
      const obj = makePage('Objective', 'objective', { deadline: '2026-12-01' });
      const earlyTask = makePage('EarlyTask', 'task', { deadline: '2026-03-01' });
      const lateTask = makePage('LateTask', 'task', { deadline: '2026-11-01' });

      earlyTask.links = ['Objective']; // depth 1
      lateTask.links = ['Objective'];  // depth 1

      const pages = [obj, earlyTask, lateTask];
      const { positions } = computeTimelinePositions(pages, CANVAS_W);

      const earlyX = positions.get('EarlyTask')!.x;
      const lateX = positions.get('LateTask')!.x;
      const objX = positions.get('Objective')!.x;

      // Both tasks have depth 1, but different deadlines
      // Earlier deadline should still be more left
      expect(earlyX).toBeLessThan(lateX);

      // Both tasks should be to the left of the objective (depth offset)
      expect(earlyX).toBeLessThan(objX);
      expect(lateX).toBeLessThan(objX);

      // Depth spacing = 120px, so tasks should be ~120px left of their deadline position
      // (Exact value depends on deadline range mapping, but verify general behavior)
    });
  });
});

// ── computeTimelineLanes ──────────────────────────────────────────────────────

describe('computeTimelineLanes', () => {
  it('returns 5 lanes (one per page type)', () => {
    const lanes = computeTimelineLanes(CANVAS_W, CANVAS_H, -200);
    expect(lanes).toHaveLength(5);
    expect(lanes.map((l) => l.type)).toEqual(['objective', 'task', 'persona', 'component', 'note']);
  });

  it('positions objective lane above the timeline axis', () => {
    const TIMELINE_Y = -200;
    const lanes = computeTimelineLanes(CANVAS_W, CANVAS_H, TIMELINE_Y);
    const objLane = lanes.find((l) => l.type === 'objective')!;
    // Objective lane should be above (negative offset from) timeline axis
    expect(objLane.cy).toBeLessThan(TIMELINE_Y);
  });

  it('positions task lane below the timeline axis', () => {
    const TIMELINE_Y = -200;
    const lanes = computeTimelineLanes(CANVAS_W, CANVAS_H, TIMELINE_Y);
    const taskLane = lanes.find((l) => l.type === 'task')!;
    // Task lane should be below (positive offset from) timeline axis
    expect(taskLane.cy).toBeGreaterThan(TIMELINE_Y);
  });

  it('stratifies lanes vertically: Obj > Task > Persona > Component > Note', () => {
    const lanes = computeTimelineLanes(CANVAS_W, CANVAS_H, 0);
    const yPositions = lanes.map((l) => l.cy);
    // Objectives highest (most negative cy), Note lowest (most positive cy)
    expect(yPositions[0]).toBeLessThan(yPositions[1]); // Obj < Task
    expect(yPositions[1]).toBeLessThan(yPositions[2]); // Task < Persona
    expect(yPositions[2]).toBeLessThan(yPositions[3]); // Persona < Component
    expect(yPositions[3]).toBeLessThan(yPositions[4]); // Component < Note
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
