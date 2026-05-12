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
// FEEDBACK011: New 3-level priority system
// Score = (explicitScore * 10000) + (incomingScore * 100) - outgoingScore
// Lower score = higher priority

describe('computeTaskPriorities', () => {
  test('task with no links has base score 30000', () => {
    const pages = [mkTask('Solo')];
    const result = computeTaskPriorities(pages);
    expect(result).toHaveLength(1);
    // explicit=undefined(3), incoming=0, outgoing=0 → 3*10000 + 0 - 0 = 30000
    expect(result[0].priority).toBe(30000);
  });

  test('task linking to a non-task has base score 30000', () => {
    const pages = [mkTask('T1', ['PersonaX']), mkNonTask('PersonaX', 'persona')];
    const result = computeTaskPriorities(pages);
    const t1 = result.find((r) => r.page.title === 'T1')!;
    // Persona links don't count as outgoing (only task/component/objective)
    expect(t1.priority).toBe(30000);
  });

  test('simple chain A->B->C: fewer incoming + more outgoing = higher priority', () => {
    // A: incoming=0, outgoing=1(B) → score = 30000 + 0 - 1 = 29999 (highest priority)
    // B: incoming=1(A), outgoing=1(C) → score = 30000 + 100 - 1 = 30099
    // C: incoming=1(B), outgoing=0 → score = 30000 + 100 - 0 = 30100 (lowest priority)
    const pages = [mkTask('A', ['B']), mkTask('B', ['C']), mkTask('C')];
    const result = computeTaskPriorities(pages);
    const map = new Map(result.map((r) => [r.page.title, r.priority]));
    expect(map.get('A')).toBe(29999);
    expect(map.get('B')).toBe(30099);
    expect(map.get('C')).toBe(30100);
  });

  test('more outgoing links to tasks = higher priority', () => {
    // A: incoming=0, outgoing=2(B,C) → score = 30000 + 0 - 2 = 29998 (highest)
    // B: incoming=1(A), outgoing=1(D) → score = 30000 + 100 - 1 = 30099
    // C: incoming=1(A), outgoing=0 → score = 30000 + 100 - 0 = 30100
    // D: incoming=1(B), outgoing=0 → score = 30000 + 100 - 0 = 30100
    const pages = [
      mkTask('A', ['B', 'C']),
      mkTask('B', ['D']),
      mkTask('C'),
      mkTask('D'),
    ];
    const result = computeTaskPriorities(pages);
    const map = new Map(result.map((r) => [r.page.title, r.priority]));
    expect(map.get('A')).toBe(29998);
    expect(map.get('B')).toBe(30099);
    expect(map.get('C')).toBe(30100);
    expect(map.get('D')).toBe(30100);
  });

  test('explicit priority (HIGH/MEDIUM/LOW) takes precedence over links', () => {
    // Create task helper with priority
    const mkTaskPri = (title: string, priority: string, links: string[] = []) => ({
      id: `${title}.md`,
      title,
      type: 'task' as const,
      metadata: { type: 'task' as const, status: 'TO-DO', priority },
      body: links.map((l) => `[[${l}]]`).join(' '),
      links,
    });

    const pages = [
      mkTaskPri('HighPri', 'HIGH', []),      // 0*10000 + 0 - 0 = 0
      mkTaskPri('MediumPri', 'MEDIUM', []), // 1*10000 + 0 - 0 = 10000
      mkTaskPri('LowPri', 'LOW', []),       // 2*10000 + 0 - 0 = 20000
      mkTask('NoPri', []),                  // 3*10000 + 0 - 0 = 30000
    ];
    const result = computeTaskPriorities(pages);
    const sorted = result.sort((a, b) => a.priority - b.priority);

    expect(sorted.map((t) => t.page.title)).toEqual(['HighPri', 'MediumPri', 'LowPri', 'NoPri']);
    expect(sorted[0].priority).toBe(0);
    expect(sorted[1].priority).toBe(10000);
    expect(sorted[2].priority).toBe(20000);
    expect(sorted[3].priority).toBe(30000);
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
    // A -> B -> A (cycle), B -> C
    // C: incoming=1(B), outgoing=0 → 30100
    // A and B are in cycle, both have incoming=1, different outgoing counts
    const pages = [mkTask('A', ['B']), mkTask('B', ['A', 'C']), mkTask('C')];
    const result = computeTaskPriorities(pages);
    const map = new Map(result.map((r) => [r.page.title, r.priority]));
    expect(map.get('C')).toBe(30100); // incoming from B
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

  test('long chain: priority decreases with more incoming links', () => {
    // A: incoming=0, outgoing=1 → 30000 + 0 - 1 = 29999 (highest priority)
    // B: incoming=1, outgoing=1 → 30000 + 100 - 1 = 30099
    // C: incoming=1, outgoing=1 → 30000 + 100 - 1 = 30099
    // D: incoming=1, outgoing=1 → 30000 + 100 - 1 = 30099
    // E: incoming=1, outgoing=0 → 30000 + 100 - 0 = 30100 (lowest priority)
    const pages = [
      mkTask('A', ['B']),
      mkTask('B', ['C']),
      mkTask('C', ['D']),
      mkTask('D', ['E']),
      mkTask('E'),
    ];
    const result = computeTaskPriorities(pages);
    const map = new Map(result.map((r) => [r.page.title, r.priority]));
    expect(map.get('A')).toBe(29999);
    expect(map.get('B')).toBe(30099);
    expect(map.get('C')).toBe(30099);
    expect(map.get('D')).toBe(30099);
    expect(map.get('E')).toBe(30100);
  });

  test('diamond dependency: incoming links affect priority', () => {
    //       A
    //      / \
    //     B   C
    //      \ /
    //       D
    // A: incoming=0, outgoing=2(B,C) → 30000 + 0 - 2 = 29998 (highest)
    // B: incoming=1(A), outgoing=1(D) → 30000 + 100 - 1 = 30099
    // C: incoming=1(A), outgoing=1(D) → 30000 + 100 - 1 = 30099
    // D: incoming=2(B,C), outgoing=0 → 30000 + 200 - 0 = 30200 (lowest)
    const pages = [
      mkTask('A', ['B', 'C']),
      mkTask('B', ['D']),
      mkTask('C', ['D']),
      mkTask('D'),
    ];
    const result = computeTaskPriorities(pages);
    const map = new Map(result.map((r) => [r.page.title, r.priority]));
    expect(map.get('A')).toBe(29998);
    expect(map.get('B')).toBe(30099);
    expect(map.get('C')).toBe(30099);
    expect(map.get('D')).toBe(30200);
  });
});

// ── Task List ordering ──────────────────────────────────────────────────────

describe('Task List ordering', () => {
  test('TO-DO tasks are sorted by ascending priority (lower score = higher priority)', () => {
    const pages = [
      mkTask('Leaf', [], 'TO-DO'),      // incoming=1(Mid), outgoing=0 → 30100
      mkTask('Mid', ['Leaf'], 'TO-DO'), // incoming=1(Root), outgoing=1(Leaf) → 30099
      mkTask('Root', ['Mid'], 'TO-DO'), // incoming=0, outgoing=1(Mid) → 29999
    ];
    const result = computeTaskPriorities(pages);
    const todos = result
      .filter((t) => t.page.metadata.status === 'TO-DO')
      .sort((a, b) => a.priority - b.priority);
    // Root has lowest score (29999) → highest priority, appears first
    expect(todos.map((t) => t.page.title)).toEqual(['Root', 'Mid', 'Leaf']);
    expect(todos.map((t) => t.priority)).toEqual([29999, 30099, 30100]);
  });

  test('WAITING tasks are sorted by ascending priority', () => {
    const pages = [
      mkTask('W-Leaf', [], 'WAITING'),      // incoming=1(W-Root), outgoing=0 → 30100
      mkTask('W-Root', ['W-Leaf'], 'WAITING'), // incoming=0, outgoing=1(W-Leaf) → 29999
    ];
    const result = computeTaskPriorities(pages);
    const waiting = result
      .filter((t) => t.page.metadata.status === 'WAITING')
      .sort((a, b) => a.priority - b.priority);
    // W-Root has lower score → appears first
    expect(waiting.map((t) => t.page.title)).toEqual(['W-Root', 'W-Leaf']);
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
      mkTask('T-A', ['T-B'], 'TO-DO'),   // incoming=0, outgoing=1 → 29999 (higher priority)
      mkTask('T-B', [], 'TO-DO'),        // incoming=1(T-A), outgoing=0 → 30100 (lower priority)
      mkTask('W-A', ['W-B'], 'WAITING'), // incoming=0, outgoing=1 → 29999
      mkTask('W-B', [], 'WAITING'),      // incoming=1(W-A), outgoing=0 → 30100
      mkTask('Done1', [], 'DONE'),       // excluded
    ];
    const result = computeTaskPriorities(pages);
    const todos = result
      .filter((t) => t.page.metadata.status === 'TO-DO')
      .sort((a, b) => a.priority - b.priority);
    const waiting = result
      .filter((t) => t.page.metadata.status === 'WAITING')
      .sort((a, b) => a.priority - b.priority);

    // T-A has lower score (29999) than T-B (30100) → appears first
    expect(todos.map((t) => t.page.title)).toEqual(['T-A', 'T-B']);
    expect(waiting.map((t) => t.page.title)).toEqual(['W-A', 'W-B']);
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
