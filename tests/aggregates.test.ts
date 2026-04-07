/* Aggregate & backlink validation tests (TASK-016).
   Verifies correctness of findBacklinks, getPersonaAggregates,
   getObjectiveAggregates, and their behaviour after renamePage. */
import {
  findBacklinks,
  getPersonaAggregates,
  getObjectiveAggregates,
  renamePage,
  pageFromSource,
} from '../src/lib/vault';
import type { HermesPage } from '../src/lib/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function mkPage(id: string, md: string): HermesPage {
  return pageFromSource(id, md);
}

function vault(...specs: [string, string][]): HermesPage[] {
  return specs.map(([id, md]) => mkPage(id, md));
}

// ── Test vault fixture ──────────────────────────────────────────────────────

function buildTestVault(): HermesPage[] {
  return vault(
    ['Alice.md',     '---\ntype: persona\n---\n\nLinks to [[TASK-A]] and [[TASK-B]] and [[OBJ-1]].'],
    ['Bob.md',       '---\ntype: persona\n---\n\nLinks to [[TASK-C]].'],
    ['TASK-A.md',    '---\ntype: task\nstatus: DONE\npriority: HIGH\nassignees: Alice\n---\n\nDone task.'],
    ['TASK-B.md',    '---\ntype: task\nstatus: DOING\npriority: MEDIUM\nassignees: Alice\n---\n\nIn progress.'],
    ['TASK-C.md',    '---\ntype: task\nstatus: TO-DO\npriority: LOW\nassignees: Bob\n---\n\nNot started. Links to [[Alice]].'],
    ['TASK-D.md',    '---\ntype: task\nstatus: DONE\npriority: HIGH\nassignees: Alice\n---\n\nAnother done task.'],
    ['OBJ-1.md',     '---\ntype: objective\ndeadline: 2026-06-30\n---\n\nTracks [[TASK-A]] and [[TASK-B]] and [[TASK-D]].'],
    ['OBJ-2.md',     '---\ntype: objective\ndeadline: 2026-09-30\n---\n\nTracks [[TASK-C]].'],
    ['Backend.md',   '---\ntype: component\n---\n\nShared infra. Links to [[Alice]].'],
    ['Notes.md',     '---\ntype: note\n---\n\nGeneral notes linking [[OBJ-1]] and [[Backend]].'],
  );
}

// ── findBacklinks tests (TASK-016 Req 1) ────────────────────────────────────

describe('findBacklinks', () => {
  const pages = buildTestVault();

  it('returns pages that link to Alice', () => {
    const backlinks = findBacklinks(pages, 'Alice');
    expect(backlinks).toContain('TASK-C');
    expect(backlinks).toContain('Backend');
    expect(backlinks).toHaveLength(2);
  });

  it('returns pages that link to TASK-A', () => {
    const backlinks = findBacklinks(pages, 'TASK-A');
    expect(backlinks).toContain('Alice');
    expect(backlinks).toContain('OBJ-1');
    expect(backlinks).toHaveLength(2);
  });

  it('returns empty array for a page with no incoming links', () => {
    const backlinks = findBacklinks(pages, 'Notes');
    expect(backlinks).toEqual([]);
  });

  it('if A links to B, B shows A in backlinks', () => {
    // Alice links to TASK-A → TASK-A backlinks contain Alice
    const backlinksForTaskA = findBacklinks(pages, 'TASK-A');
    expect(backlinksForTaskA).toContain('Alice');

    // OBJ-1 links to TASK-B → TASK-B backlinks contain OBJ-1
    const backlinksForTaskB = findBacklinks(pages, 'TASK-B');
    expect(backlinksForTaskB).toContain('OBJ-1');
    expect(backlinksForTaskB).toContain('Alice');
  });

  it('backlinks are symmetric: each outgoing link creates a backlink', () => {
    for (const page of pages) {
      for (const linkTitle of page.links) {
        const backlinks = findBacklinks(pages, linkTitle);
        expect(backlinks).toContain(page.title);
      }
    }
  });
});

// ── getPersonaAggregates tests (TASK-016 Req 2) ─────────────────────────────

describe('getPersonaAggregates', () => {
  const pages = buildTestVault();

  it('counts tasks assigned to Alice correctly', () => {
    const agg = getPersonaAggregates(pages, 'Alice');
    // TASK-A, TASK-B, TASK-D have assignees: Alice
    expect(agg.taskCount).toBe(3);
  });

  it('counts tasks assigned to Bob correctly', () => {
    const agg = getPersonaAggregates(pages, 'Bob');
    // TASK-C has assignees: Bob
    expect(agg.taskCount).toBe(1);
  });

  it('counts objectives linked to Alice', () => {
    const agg = getPersonaAggregates(pages, 'Alice');
    // Alice page links to OBJ-1, but the function checks objectives linking TO persona
    // OBJ-1 does not link to Alice directly; only Alice links to OBJ-1
    // So objectiveCount should be 0 from OBJ perspective
    expect(agg.objectiveCount).toBe(0);
  });

  it('returns zero for a persona with no assignments', () => {
    const pagesWithNoAssignment = vault(
      ['Eve.md', '---\ntype: persona\n---\n\nNo tasks assigned.'],
      ['TASK-X.md', '---\ntype: task\nstatus: TO-DO\npriority: LOW\nassignees: Someone\n---\n\nTask.'],
    );
    const agg = getPersonaAggregates(pagesWithNoAssignment, 'Eve');
    expect(agg.taskCount).toBe(0);
    expect(agg.objectiveCount).toBe(0);
  });

  it('handles multiple personas without cross-contamination', () => {
    const aliceAgg = getPersonaAggregates(pages, 'Alice');
    const bobAgg = getPersonaAggregates(pages, 'Bob');
    expect(aliceAgg.taskCount + bobAgg.taskCount).toBe(4); // 3 Alice + 1 Bob = all 4 tasks
  });
});

// ── getObjectiveAggregates tests (TASK-016 Req 2 cont.) ─────────────────────

describe('getObjectiveAggregates', () => {
  const pages = buildTestVault();

  it('OBJ-1 shows correct task completion ratio', () => {
    const obj1 = pages.find((p) => p.title === 'OBJ-1')!;
    const agg = getObjectiveAggregates(pages, obj1);
    // OBJ-1 links to TASK-A (DONE), TASK-B (DOING), TASK-D (DONE) → 2/3
    expect(agg.totalTasks).toBe(3);
    expect(agg.completedTasks).toBe(2);
  });

  it('OBJ-2 shows correct task completion ratio', () => {
    const obj2 = pages.find((p) => p.title === 'OBJ-2')!;
    const agg = getObjectiveAggregates(pages, obj2);
    // OBJ-2 links to TASK-C (TO-DO) → 0/1
    expect(agg.totalTasks).toBe(1);
    expect(agg.completedTasks).toBe(0);
  });

  it('objective with all tasks DONE shows 100% completion', () => {
    const allDone = vault(
      ['T1.md', '---\ntype: task\nstatus: DONE\npriority: LOW\n---\n\nDone.'],
      ['T2.md', '---\ntype: task\nstatus: DONE\npriority: LOW\n---\n\nDone.'],
      ['O.md',  '---\ntype: objective\n---\n\nTracks [[T1]] and [[T2]].'],
    );
    const obj = allDone.find((p) => p.title === 'O')!;
    const agg = getObjectiveAggregates(allDone, obj);
    expect(agg.totalTasks).toBe(2);
    expect(agg.completedTasks).toBe(2);
  });

  it('objective linking to non-task pages does not count them', () => {
    const mixed = vault(
      ['T1.md',   '---\ntype: task\nstatus: DONE\npriority: LOW\n---\n\nDone.'],
      ['Note.md', '---\ntype: note\n---\n\nJust a note.'],
      ['O.md',    '---\ntype: objective\n---\n\nTracks [[T1]] and [[Note]].'],
    );
    const obj = mixed.find((p) => p.title === 'O')!;
    const agg = getObjectiveAggregates(mixed, obj);
    expect(agg.totalTasks).toBe(1);
    expect(agg.completedTasks).toBe(1);
  });
});

// ── Regression tests: renamePage updates backlinks & aggregates (TASK-016 Req 3) ─

describe('renamePage preserves backlinks and aggregate integrity', () => {
  it('renaming a task keeps persona aggregate counts consistent', () => {
    const pages = buildTestVault();
    const aliceAggBefore = getPersonaAggregates(pages, 'Alice');

    // Rename TASK-A to TASK-ALPHA
    const renamed = renamePage(pages, 'TASK-A', 'TASK-ALPHA');

    // Alice page body should now contain [[TASK-ALPHA]] instead of [[TASK-A]]
    const alicePage = renamed.find((p) => p.title === 'Alice')!;
    expect(alicePage.links).toContain('TASK-ALPHA');
    expect(alicePage.links).not.toContain('TASK-A');

    // The assignee on the renamed task is still Alice → aggregate count unchanged
    const aliceAggAfter = getPersonaAggregates(renamed, 'Alice');
    expect(aliceAggAfter.taskCount).toBe(aliceAggBefore.taskCount);
  });

  it('renaming a task updates objective aggregates correctly', () => {
    const pages = buildTestVault();
    const obj1Before = pages.find((p) => p.title === 'OBJ-1')!;
    const aggBefore = getObjectiveAggregates(pages, obj1Before);

    // Rename TASK-A to TASK-RENAMED
    const renamed = renamePage(pages, 'TASK-A', 'TASK-RENAMED');
    const obj1After = renamed.find((p) => p.title === 'OBJ-1')!;

    // OBJ-1 links should now reference TASK-RENAMED
    expect(obj1After.links).toContain('TASK-RENAMED');
    expect(obj1After.links).not.toContain('TASK-A');

    // Aggregate counts must be identical since only the name changed
    const aggAfter = getObjectiveAggregates(renamed, obj1After);
    expect(aggAfter.totalTasks).toBe(aggBefore.totalTasks);
    expect(aggAfter.completedTasks).toBe(aggBefore.completedTasks);
  });

  it('renaming a persona updates backlinks from task pages', () => {
    const pages = buildTestVault();
    const backBefore = findBacklinks(pages, 'Alice');

    // Rename Alice to Alicia
    const renamed = renamePage(pages, 'Alice', 'Alicia');

    // Old backlinks for "Alice" should be gone
    const backOld = findBacklinks(renamed, 'Alice');
    expect(backOld).toEqual([]);

    // New backlinks for "Alicia" should match the original count
    const backNew = findBacklinks(renamed, 'Alicia');
    expect(backNew.length).toBe(backBefore.length);
  });

  it('renaming does not break broken-link detection', () => {
    const pages = vault(
      ['A.md', '---\ntype: note\n---\n\nLinks to [[B]] and [[Ghost]].'],
      ['B.md', '---\ntype: note\n---\n\nLinks to [[A]].'],
    );
    const renamed = renamePage(pages, 'B', 'Beta');

    // "Ghost" is still broken
    const { findBrokenLinks } = require('../src/lib/vault');
    const broken = findBrokenLinks(renamed);
    expect(broken).toHaveLength(1);
    expect(broken[0].brokenLink).toBe('Ghost');
  });

  it('renaming a page preserves total page count', () => {
    const pages = buildTestVault();
    const countBefore = pages.length;
    const renamed = renamePage(pages, 'TASK-A', 'TASK-X');
    expect(renamed).toHaveLength(countBefore);
  });
});
