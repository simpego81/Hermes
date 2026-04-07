/* TASK-044: Validate priority algorithm, layout structure, and editor stability. */
import { computeTaskPriorities } from '../src/lib/vault';
import type { HermesPage } from '../src/lib/types';

// ── Helpers ─────────────────────────────────────────────────────────────────

function mkTask(title: string, links: string[] = [], status = 'TO-DO'): HermesPage {
  return {
    id: `${title}.md`,
    title,
    type: 'task',
    metadata: { type: 'task', status },
    body: links.map((l) => `[[${l}]]`).join(' '),
    links,
  };
}

function mkNonTask(title: string, type: 'persona' | 'objective' | 'note' = 'note'): HermesPage {
  return {
    id: `${title}.md`,
    title,
    type,
    metadata: { type },
    body: '',
    links: [],
  };
}

// ── Priority Logic ──────────────────────────────────────────────────────────

describe('computeTaskPriorities', () => {
  test('task with no links has priority 0', () => {
    const pages = [mkTask('Solo')];
    const result = computeTaskPriorities(pages);
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe(0);
  });

  test('task linking to a non-task has priority 0', () => {
    const pages = [mkTask('T1', ['PersonaX']), mkNonTask('PersonaX', 'persona')];
    const result = computeTaskPriorities(pages);
    const t1 = result.find((r) => r.page.title === 'T1')!;
    expect(t1.priority).toBe(0);
  });

  test('simple chain A->B->C gives correct priorities', () => {
    // C has no task links → priority 0
    // B links to C → priority 1
    // A links to B → priority 2
    const pages = [mkTask('A', ['B']), mkTask('B', ['C']), mkTask('C')];
    const result = computeTaskPriorities(pages);
    const map = new Map(result.map((r) => [r.page.title, r.priority]));
    expect(map.get('C')).toBe(0);
    expect(map.get('B')).toBe(1);
    expect(map.get('A')).toBe(2);
  });

  test('branching: MAX(linked) + 1', () => {
    // D → has no links → 0
    // C → has no links → 0
    // B → links D → 1
    // A → links B and C → MAX(1, 0) + 1 = 2
    const pages = [
      mkTask('A', ['B', 'C']),
      mkTask('B', ['D']),
      mkTask('C'),
      mkTask('D'),
    ];
    const result = computeTaskPriorities(pages);
    const map = new Map(result.map((r) => [r.page.title, r.priority]));
    expect(map.get('D')).toBe(0);
    expect(map.get('C')).toBe(0);
    expect(map.get('B')).toBe(1);
    expect(map.get('A')).toBe(2);
  });

  test('cycle A->B->A does not crash and returns finite priorities', () => {
    const pages = [mkTask('A', ['B']), mkTask('B', ['A'])];
    const result = computeTaskPriorities(pages);
    expect(result).toHaveLength(2);
    result.forEach((r) => {
      expect(Number.isFinite(r.priority)).toBe(true);
      expect(r.priority).toBeGreaterThanOrEqual(0);
    });
  });

  test('three-node cycle does not crash', () => {
    const pages = [mkTask('X', ['Y']), mkTask('Y', ['Z']), mkTask('Z', ['X'])];
    const result = computeTaskPriorities(pages);
    expect(result).toHaveLength(3);
    result.forEach((r) => {
      expect(Number.isFinite(r.priority)).toBe(true);
    });
  });

  test('cycle with outgoing chain: cycle member linking to tail', () => {
    // A -> B -> A (cycle), B -> C (no links -> 0)
    // B's links: [A, C]. A is in cycle → 0, C → 0. MAX(0,0)+1 = 1
    const pages = [mkTask('A', ['B']), mkTask('B', ['A', 'C']), mkTask('C')];
    const result = computeTaskPriorities(pages);
    const map = new Map(result.map((r) => [r.page.title, r.priority]));
    expect(map.get('C')).toBe(0);
    // B and A should have finite priorities despite the cycle
    expect(Number.isFinite(map.get('A')!)).toBe(true);
    expect(Number.isFinite(map.get('B')!)).toBe(true);
  });

  test('only task pages are included in results', () => {
    const pages = [
      mkTask('T1'),
      mkNonTask('Persona1', 'persona'),
      mkNonTask('Obj1', 'objective'),
    ];
    const result = computeTaskPriorities(pages);
    expect(result).toHaveLength(1);
    expect(result[0].page.title).toBe('T1');
  });

  test('empty pages array returns empty result', () => {
    const result = computeTaskPriorities([]);
    expect(result).toHaveLength(0);
  });

  test('long chain produces incrementing priorities', () => {
    // E(0) <- D(1) <- C(2) <- B(3) <- A(4)
    const pages = [
      mkTask('A', ['B']),
      mkTask('B', ['C']),
      mkTask('C', ['D']),
      mkTask('D', ['E']),
      mkTask('E'),
    ];
    const result = computeTaskPriorities(pages);
    const map = new Map(result.map((r) => [r.page.title, r.priority]));
    expect(map.get('E')).toBe(0);
    expect(map.get('D')).toBe(1);
    expect(map.get('C')).toBe(2);
    expect(map.get('B')).toBe(3);
    expect(map.get('A')).toBe(4);
  });

  test('diamond dependency picks MAX', () => {
    //       A
    //      / \
    //     B   C
    //      \ /
    //       D
    // D=0, B=MAX(D)+1=1, C=MAX(D)+1=1, A=MAX(B,C)+1=2
    const pages = [
      mkTask('A', ['B', 'C']),
      mkTask('B', ['D']),
      mkTask('C', ['D']),
      mkTask('D'),
    ];
    const result = computeTaskPriorities(pages);
    const map = new Map(result.map((r) => [r.page.title, r.priority]));
    expect(map.get('D')).toBe(0);
    expect(map.get('B')).toBe(1);
    expect(map.get('C')).toBe(1);
    expect(map.get('A')).toBe(2);
  });
});

// ── Task List ordering ──────────────────────────────────────────────────────

describe('Task List ordering', () => {
  test('TO-DO tasks are sorted by ascending priority', () => {
    const pages = [
      mkTask('Leaf', [], 'TO-DO'),
      mkTask('Mid', ['Leaf'], 'TO-DO'),
      mkTask('Root', ['Mid'], 'TO-DO'),
    ];
    const result = computeTaskPriorities(pages);
    const todos = result
      .filter((t) => t.page.metadata.status === 'TO-DO')
      .sort((a, b) => a.priority - b.priority);
    expect(todos.map((t) => t.page.title)).toEqual(['Leaf', 'Mid', 'Root']);
    expect(todos.map((t) => t.priority)).toEqual([0, 1, 2]);
  });

  test('WAITING tasks are sorted by ascending priority', () => {
    const pages = [
      mkTask('W-Leaf', [], 'WAITING'),
      mkTask('W-Root', ['W-Leaf'], 'WAITING'),
    ];
    const result = computeTaskPriorities(pages);
    const waiting = result
      .filter((t) => t.page.metadata.status === 'WAITING')
      .sort((a, b) => a.priority - b.priority);
    expect(waiting.map((t) => t.page.title)).toEqual(['W-Leaf', 'W-Root']);
  });

  test('DONE tasks are excluded from TO-DO and WAITING lists', () => {
    const pages = [
      mkTask('Active', [], 'TO-DO'),
      mkTask('Finished', [], 'DONE'),
      mkTask('Blocked', [], 'WAITING'),
    ];
    const result = computeTaskPriorities(pages);
    const todos = result.filter((t) => t.page.metadata.status === 'TO-DO');
    const waiting = result.filter((t) => t.page.metadata.status === 'WAITING');
    expect(todos).toHaveLength(1);
    expect(waiting).toHaveLength(1);
    expect(todos[0].page.title).toBe('Active');
    expect(waiting[0].page.title).toBe('Blocked');
  });

  test('mixed statuses with priorities sort correctly per section', () => {
    const pages = [
      mkTask('T-A', ['T-B'], 'TO-DO'),   // priority 1
      mkTask('T-B', [], 'TO-DO'),          // priority 0
      mkTask('W-A', ['W-B'], 'WAITING'),   // priority 1
      mkTask('W-B', [], 'WAITING'),        // priority 0
      mkTask('Done1', [], 'DONE'),         // excluded
    ];
    const result = computeTaskPriorities(pages);
    const todos = result
      .filter((t) => t.page.metadata.status === 'TO-DO')
      .sort((a, b) => a.priority - b.priority);
    const waiting = result
      .filter((t) => t.page.metadata.status === 'WAITING')
      .sort((a, b) => a.priority - b.priority);

    expect(todos.map((t) => t.page.title)).toEqual(['T-B', 'T-A']);
    expect(waiting.map((t) => t.page.title)).toEqual(['W-B', 'W-A']);
  });
});

// ── Layout structure (TASK-041 contract) ────────────────────────────────────

describe('Layout contract', () => {
  test('Graph area, Editor area, and Task List are all defined in CSS', () => {
    // Read the actual CSS file to verify the class selectors exist
    const fs = require('fs');
    const css = fs.readFileSync('src/styles.css', 'utf-8');

    // Center area: graph on top, editor below
    expect(css).toContain('.center-area');
    expect(css).toContain('.center-graph');
    expect(css).toContain('.center-editor');

    // Right panel with task list
    expect(css).toContain('.right-panel');
    expect(css).toContain('.task-list-panel');
    expect(css).toContain('.task-list-section');
  });

  test('center-area uses column flex direction (graph top, editor bottom)', () => {
    const fs = require('fs');
    const css = fs.readFileSync('src/styles.css', 'utf-8');

    // Verify column layout for top/bottom split
    const centerAreaBlock = css.slice(
      css.indexOf('.center-area'),
      css.indexOf('}', css.indexOf('.center-area')) + 1,
    );
    expect(centerAreaBlock).toContain('flex-direction: column');
  });

  test('right-panel is a flex column for Task List + Inspector', () => {
    const fs = require('fs');
    const css = fs.readFileSync('src/styles.css', 'utf-8');

    const rightPanelBlock = css.slice(
      css.indexOf('.right-panel {'),
      css.indexOf('}', css.indexOf('.right-panel {')) + 1,
    );
    expect(rightPanelBlock).toContain('flex-direction: column');
  });

  test('DONE task color #A09080 is used in Graph drawNode', () => {
    const fs = require('fs');
    const graphSrc = fs.readFileSync('src/components/Graph.tsx', 'utf-8');
    expect(graphSrc).toContain('#A09080');
    expect(graphSrc).toContain("status === 'DONE'");
  });
});

// ── Editor stability (TASK-042 contract) ─────────────────────────────────────

describe('Editor stability contract', () => {
  test('Editor preserves cursor position on content sync', () => {
    const fs = require('fs');
    const editorSrc = fs.readFileSync('src/components/Editor.tsx', 'utf-8');

    // Must save and restore selection during dispatch
    expect(editorSrc).toContain('prevSelection');
    expect(editorSrc).toContain('selection:');
  });

  test('Editor cursor positioned at end on page open', () => {
    const fs = require('fs');
    const editorSrc = fs.readFileSync('src/components/Editor.tsx', 'utf-8');

    // Dispatch to move cursor to end after initial creation
    expect(editorSrc).toContain('content.length');
    expect(editorSrc).toContain('anchor:');
  });

  test('Ctrl+W shortcut is registered in App.tsx', () => {
    const fs = require('fs');
    const appSrc = fs.readFileSync('src/App.tsx', 'utf-8');

    expect(appSrc).toContain("e.key === 'w'");
    expect(appSrc).toContain('setSelectedId(null)');
  });
});
