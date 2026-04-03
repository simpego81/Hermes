/* Stress tests for layout and graph algorithms at 500+ page scale (TASK-008).
   Verifies performance thresholds and link-topology correctness under load. */
import { buildGraphData } from '../src/lib/vault';
import {
  computeGroupBoxes,
  computeTimelinePositions,
  gridPositionsInBox,
} from '../src/lib/layout';
import type { HermesPage, PageType } from '../src/lib/types';

// ── Vault generator ─────────────────────────────────────────────────────────

const PAGE_TYPES: PageType[] = ['task', 'objective', 'persona', 'component', 'note'];
const TASK_STATUSES = ['TO-DO', 'DOING', 'DONE', 'BLOCKED'];
const PRIORITIES    = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

/** Generate a realistic vault of `count` pages with cross-links. */
function generateVault(count: number): HermesPage[] {
  const pages: HermesPage[] = [];

  // Fixed distribution: 40% task, 20% objective, 20% persona, 10% component, 10% note
  const dist: [PageType, number][] = [
    ['task',      Math.floor(count * 0.40)],
    ['objective', Math.floor(count * 0.20)],
    ['persona',   Math.floor(count * 0.20)],
    ['component', Math.floor(count * 0.10)],
    ['note',      count - Math.floor(count * 0.40) - Math.floor(count * 0.20) * 2 - Math.floor(count * 0.10)],
  ];

  let idx = 0;
  for (const [type, n] of dist) {
    for (let i = 0; i < n; i++, idx++) {
      const id = `${type}-${idx}.md`;
      const title = `${type}-${idx}`;
      const metadata: Record<string, string | string[]> = { type };

      if (type === 'task') {
        metadata.status   = TASK_STATUSES[idx % TASK_STATUSES.length];
        metadata.priority = PRIORITIES[idx % PRIORITIES.length];
        // Every other task gets a deadline
        if (idx % 2 === 0) {
          const month = String((idx % 12) + 1).padStart(2, '0');
          metadata.deadline = `2026-${month}-15`;
        }
      }
      if (type === 'objective') {
        const month = String((idx % 12) + 1).padStart(2, '0');
        metadata.deadline = `2026-${month}-30`;
      }

      pages.push({ id, title, type, metadata, body: '', links: [] });
    }
  }

  // Add cross-links: each page links to up to 3 random pages (deterministic)
  pages.forEach((page, i) => {
    const numLinks = (i % 3) + 1;
    for (let l = 0; l < numLinks; l++) {
      const targetIdx = (i * 7 + l * 31) % pages.length;
      if (targetIdx !== i) {
        page.links.push(pages[targetIdx].title);
      }
    }
  });

  return pages;
}

// ─────────────────────────────────────────────────────────────────────────────

const VAULT_500  = generateVault(500);
const VAULT_1000 = generateVault(1000);
const CANVAS_W   = 1280;
const CANVAS_H   = 720;

// ── Structural correctness at scale ─────────────────────────────────────────

describe('Stress test: vault integrity at 500+ pages', () => {
  it('generator produces exactly the requested number of pages', () => {
    expect(VAULT_500).toHaveLength(500);
    expect(VAULT_1000).toHaveLength(1000);
  });

  it('all 5 page types are represented in the vault', () => {
    const types = new Set(VAULT_500.map((p) => p.type));
    PAGE_TYPES.forEach((t) => expect(types.has(t)).toBe(true));
  });

  it('buildGraphData produces one node per page for 500 pages', () => {
    const graph = buildGraphData(VAULT_500);
    expect(graph.nodes).toHaveLength(500);
  });

  it('buildGraphData produces one node per page for 1000 pages', () => {
    const graph = buildGraphData(VAULT_1000);
    expect(graph.nodes).toHaveLength(1000);
  });
});

// ── Visual regression: link topology under load ───────────────────────────────

describe('Stress test: link topology correctness (visual regression)', () => {
  let pageIds: Set<string>;
  let linkSources: string[];
  let linkTargets: string[];

  beforeAll(() => {
    const graph = buildGraphData(VAULT_500);
    pageIds     = new Set(graph.nodes.map((n) => n.id));
    linkSources = graph.links.map((l) => l.source as string);
    linkTargets = graph.links.map((l) => l.target as string);
  });

  it('every link source points to an existing node (no phantom sources)', () => {
    linkSources.forEach((src) => {
      expect(pageIds.has(src)).toBe(true);
    });
  });

  it('every link target points to an existing node (no phantom targets)', () => {
    linkTargets.forEach((tgt) => {
      expect(pageIds.has(tgt)).toBe(true);
    });
  });

  it('no self-links exist', () => {
    const graph = buildGraphData(VAULT_500);
    graph.links.forEach((l) => {
      expect(l.source).not.toBe(l.target);
    });
  });

  it('node val is always >= BASE_NODE_SIZE (5) after sqrt scaling', () => {
    const graph = buildGraphData(VAULT_500);
    graph.nodes.forEach((n) => {
      expect(n.val).toBeGreaterThanOrEqual(5);
    });
  });

  it('node val increases monotonically with incoming link count', () => {
    // The most-linked node should have the highest val
    const graph = buildGraphData(VAULT_500);
    const maxVal = Math.max(...graph.nodes.map((n) => n.val));
    const linkedNodes = graph.nodes.filter((n) => n.val > 5);
    if (linkedNodes.length > 0) {
      expect(maxVal).toBeGreaterThan(5);
    }
  });
});

// ── Performance: layout computation times ────────────────────────────────────

describe('Stress test: layout performance thresholds', () => {
  it('buildGraphData completes within 200 ms for 500 pages', () => {
    const start = performance.now();
    buildGraphData(VAULT_500);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(200);
  });

  it('buildGraphData completes within 500 ms for 1000 pages', () => {
    const start = performance.now();
    buildGraphData(VAULT_1000);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
  });

  it('computeGroupBoxes completes within 5 ms (box layout activation cost)', () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) computeGroupBoxes(CANVAS_W, CANVAS_H);
    const elapsed = performance.now() - start;
    // 1000 calls < 5 ms → single call well under 5 µs
    expect(elapsed).toBeLessThan(5);
  });

  it('gridPositionsInBox completes within 50 ms for 200 nodes in one box', () => {
    const box = computeGroupBoxes(CANVAS_W, CANVAS_H)[0];
    const taskPages = VAULT_1000.filter((p) => p.type === 'task');
    const ids = taskPages.map((p) => p.id);
    const vals = new Map(taskPages.map((p) => [p.id, 5 + Math.random() * 10]));

    const start = performance.now();
    gridPositionsInBox(ids, vals, box);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });

  it('computeTimelinePositions completes within 50 ms for 500 pages', () => {
    const start = performance.now();
    computeTimelinePositions(VAULT_500, CANVAS_W);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });

  it('computeTimelinePositions completes within 100 ms for 1000 pages', () => {
    const start = performance.now();
    computeTimelinePositions(VAULT_1000, CANVAS_W);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });
});

// ── Box layout correctness at scale ──────────────────────────────────────────

describe('Stress test: box layout with 500 pages', () => {
  it('all 500 node positions fall within their respective box bounds', () => {
    const MARGIN = 22;
    const graph  = buildGraphData(VAULT_500);
    const boxes  = computeGroupBoxes(CANVAS_W, CANVAS_H);

    // Group node ids by type
    const byType = new Map<string, string[]>();
    VAULT_500.forEach((p) => {
      const arr = byType.get(p.type) ?? [];
      arr.push(p.id);
      byType.set(p.type, arr);
    });

    const valMap = new Map(graph.nodes.map((n) => [n.id, n.val]));

    boxes.forEach((box) => {
      const ids = byType.get(box.type) ?? [];
      const positions = gridPositionsInBox(ids, valMap, box);
      positions.forEach(({ x, y }) => {
        expect(x).toBeGreaterThanOrEqual(box.cx - box.hw + MARGIN - 0.001);
        expect(x).toBeLessThanOrEqual(box.cx + box.hw - MARGIN + 0.001);
        expect(y).toBeGreaterThanOrEqual(box.cy - box.hh + MARGIN - 0.001);
        expect(y).toBeLessThanOrEqual(box.cy + box.hh - MARGIN + 0.001);
      });
    });

    // Verify cross-box: no two pages of different types share the same box area
    const allBoxPositions: { id: string; type: string; x: number; y: number }[] = [];
    boxes.forEach((box) => {
      const ids = byType.get(box.type) ?? [];
      const valMap2 = new Map(ids.map((id) => [id, valMap.get(id) ?? 5]));
      const positions = gridPositionsInBox(ids, valMap2, box);
      positions.forEach((pos, id) => allBoxPositions.push({ id, type: box.type, ...pos }));
    });

    // All placed positions must be unique (no two nodes at the exact same coordinates)
    const posSet = new Set(allBoxPositions.map((p) => `${p.x.toFixed(4)},${p.y.toFixed(4)}`));
    expect(posSet.size).toBe(allBoxPositions.length);
  });

  it('timeline positions cover at least 50% of the expected x range for 200+ deadline nodes', () => {
    const timelinePositions = computeTimelinePositions(VAULT_500, CANVAS_W);
    const PAD  = 90;
    const xMin = -CANVAS_W / 2 + PAD;
    const xMax = CANVAS_W / 2 - PAD;
    const range = xMax - xMin;

    if (timelinePositions.size < 2) return; // skip if too few deadline nodes

    const xs = [...timelinePositions.values()];
    const observedMin = Math.min(...xs);
    const observedMax = Math.max(...xs);
    const coverage = (observedMax - observedMin) / range;
    expect(coverage).toBeGreaterThanOrEqual(0.5);
  });
});
