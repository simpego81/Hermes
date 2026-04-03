/* Integration tests for vault.ts: pageFromSource, buildGraphData, and
   graph link-count consistency (TASK-005). */
import { buildGraphData, pageFromSource } from '../src/lib/vault';
import type { HermesPage } from '../src/lib/types';

// ---------------------------------------------------------------------------
// Test vault — one page per category, with a known link graph
// ---------------------------------------------------------------------------

/** Helpers to build a minimal markdown source per type. */
function mkMarkdown(frontmatter: string, body: string): string {
  return `---\n${frontmatter}\n---\n\n${body}`;
}

const VAULT_SOURCES: { id: string; content: string }[] = [
  {
    id: 'personas/Alice.md',
    content: mkMarkdown(
      'type: persona',
      'Lead of the team. Works on [[TASK-Alpha]] and [[TASK-Beta]].',
    ),
  },
  {
    id: 'tasks/TASK-Alpha.md',
    content: mkMarkdown(
      'type: task\nstatus: DOING\npriority: HIGH\ndeadline: 2026-06-01',
      'Implement feature A. Depends on [[Core Component]].',
    ),
  },
  {
    id: 'tasks/TASK-Beta.md',
    content: mkMarkdown(
      'type: task\nstatus: TO-DO\npriority: MEDIUM',
      'Implement feature B. Depends on [[Core Component]].',
    ),
  },
  {
    id: 'objectives/Q2 Goal.md',
    content: mkMarkdown(
      'type: objective\ndeadline: 2026-06-30',
      'Ship Q2 milestone. Tracks [[TASK-Alpha]] and [[TASK-Beta]].',
    ),
  },
  {
    id: 'components/Core Component.md',
    content: mkMarkdown('type: component', 'Shared infrastructure module.'),
  },
  {
    id: 'notes/Architecture Notes.md',
    content: mkMarkdown(
      'type: note',
      'Notes referencing [[Core Component]] and [[Q2 Goal]].',
    ),
  },
];

// ---------------------------------------------------------------------------
// pageFromSource — integration tests
// ---------------------------------------------------------------------------

describe('pageFromSource', () => {
  it('parses all 5 page types correctly from markdown sources', () => {
    const expected: Array<{ id: string; type: string; title: string }> = [
      { id: 'personas/Alice.md', type: 'persona', title: 'Alice' },
      { id: 'tasks/TASK-Alpha.md', type: 'task', title: 'TASK-Alpha' },
      { id: 'tasks/TASK-Beta.md', type: 'task', title: 'TASK-Beta' },
      { id: 'objectives/Q2 Goal.md', type: 'objective', title: 'Q2 Goal' },
      { id: 'components/Core Component.md', type: 'component', title: 'Core Component' },
      { id: 'notes/Architecture Notes.md', type: 'note', title: 'Architecture Notes' },
    ];

    VAULT_SOURCES.forEach(({ id, content }, i) => {
      const page = pageFromSource(id, content);
      expect(page.id).toBe(expected[i].id);
      expect(page.type).toBe(expected[i].type);
      expect(page.title).toBe(expected[i].title);
    });
  });

  it('strips .md extension and nested path from title', () => {
    const page = pageFromSource('deep/nested/folder/My Page.md', '---\ntype: note\n---\n\nbody');
    expect(page.title).toBe('My Page');
  });

  it('falls back to type "note" for unknown or missing type', () => {
    const noType = pageFromSource('file.md', 'No frontmatter here.');
    expect(noType.type).toBe('note');

    const unknownType = pageFromSource('file.md', '---\ntype: dragon\n---\n\nbody');
    expect(unknownType.type).toBe('note');
  });

  it('extracts wiki-link references from the body', () => {
    const page = pageFromSource(
      'tasks/TASK-Alpha.md',
      VAULT_SOURCES[1].content,
    );
    expect(page.links).toContain('Core Component');
  });

  it('handles a file with no frontmatter gracefully', () => {
    const page = pageFromSource('raw.md', 'Just raw text, no YAML.');
    expect(page.metadata).toEqual({});
    expect(page.body).toBe('Just raw text, no YAML.');
    expect(page.type).toBe('note');
  });

  it('preserves scalar and array metadata from frontmatter', () => {
    const content = mkMarkdown(
      'type: task\nstatus: DONE\npriority: HIGH\nassignees: [[Alice]]',
      'Completed.',
    );
    const page = pageFromSource('tasks/X.md', content);
    expect(page.metadata.status).toBe('DONE');
    expect(page.metadata.priority).toBe('HIGH');
    expect(page.metadata.assignees).toEqual(['Alice']);
  });
});

// ---------------------------------------------------------------------------
// buildGraphData — graph consistency tests
// ---------------------------------------------------------------------------

describe('buildGraphData', () => {
  let pages: HermesPage[];

  beforeEach(() => {
    pages = VAULT_SOURCES.map(({ id, content }) => pageFromSource(id, content));
  });

  it('produces one node per page', () => {
    const graph = buildGraphData(pages);
    expect(graph.nodes).toHaveLength(pages.length);
  });

  it('every node id matches a source page id', () => {
    const graph = buildGraphData(pages);
    const pageIds = new Set(pages.map((p) => p.id));
    graph.nodes.forEach((node) => expect(pageIds.has(node.id)).toBe(true));
  });

  it('produces links only between existing pages', () => {
    const graph = buildGraphData(pages);
    const pageIds = new Set(pages.map((p) => p.id));
    graph.links.forEach((link) => {
      expect(pageIds.has(link.source as string)).toBe(true);
      expect(pageIds.has(link.target as string)).toBe(true);
    });
  });

  it('computes incoming link counts correctly for Core Component', () => {
    // Alice → Core Component (via body link to [[Core Component]])? No, Alice links to TASK-Alpha and TASK-Beta.
    // TASK-Alpha → Core Component, TASK-Beta → Core Component, Architecture Notes → Core Component
    // Expected: 3 incoming links to Core Component
    const graph = buildGraphData(pages);
    const coreNode = graph.nodes.find((n) => n.id === 'components/Core Component.md');
    // val = 5 + sqrt(3) * 2 ≈ 5 + 3.464 ≈ 8.464
    const expectedVal = 5 + Math.sqrt(3) * 2;
    expect(coreNode!.val).toBeCloseTo(expectedVal, 5);
  });

  it('uses sqrt scaling: val = 5 + sqrt(incoming) * 2', () => {
    // Q2 Goal is referenced by Architecture Notes only (1 incoming)
    const graph = buildGraphData(pages);
    const q2Node = graph.nodes.find((n) => n.id === 'objectives/Q2 Goal.md');
    const expectedVal = 5 + Math.sqrt(1) * 2; // = 7
    expect(q2Node!.val).toBeCloseTo(expectedVal, 5);
  });

  it('nodes with no incoming links have the base size (5)', () => {
    // Alice has no incoming links
    const graph = buildGraphData(pages);
    const alice = graph.nodes.find((n) => n.id === 'personas/Alice.md');
    expect(alice!.val).toBeCloseTo(5, 5);
  });

  it('produces no links for pages with no wiki-link references', () => {
    const onlyPages: HermesPage[] = [
      pageFromSource('A.md', mkMarkdown('type: note', 'No links here.')),
      pageFromSource('B.md', mkMarkdown('type: note', 'Also no links.')),
    ];
    const graph = buildGraphData(onlyPages);
    expect(graph.links).toHaveLength(0);
  });

  it('ignores broken links (references to non-existent pages)', () => {
    const pages: HermesPage[] = [
      pageFromSource('A.md', mkMarkdown('type: note', 'Links to [[Ghost Page]] which does not exist.')),
    ];
    const graph = buildGraphData(pages);
    expect(graph.nodes).toHaveLength(1);
    expect(graph.links).toHaveLength(0);
  });

  it('correctly maps multiple outgoing links from one page', () => {
    // Alice references TASK-Alpha and TASK-Beta in body
    const graph = buildGraphData(pages);
    const aliceLinks = graph.links.filter((l) => l.source === 'personas/Alice.md');
    const aliceTargets = aliceLinks.map((l) => l.target);
    expect(aliceTargets).toContain('tasks/TASK-Alpha.md');
    expect(aliceTargets).toContain('tasks/TASK-Beta.md');
  });
});
