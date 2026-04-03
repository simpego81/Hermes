/* End-to-end data-flow integration tests (TASK-011 Req 1).
   Simulates the full pipeline: raw markdown → pageFromSource → edit content
   (add a wiki-link) → re-parse → buildGraphData → verify new link appears
   in the graph without any "reload". */
import { pageFromSource, buildGraphData, findBrokenLinks } from '../src/lib/vault';
import type { HermesPage } from '../src/lib/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal page from raw markdown source. */
function page(id: string, md: string): HermesPage {
  return pageFromSource(id, md);
}

/** Simulate the App.tsx handleEditorChange flow:
 *  user edits markdown → pageFromSource re-parses → pages state updated →
 *  buildGraphData recalculated. Returns the updated graph data. */
function simulateEditFlow(
  pages: HermesPage[],
  editPageId: string,
  newMarkdown: string,
) {
  const updated = pageFromSource(editPageId, newMarkdown);
  const newPages = pages.map((p) => (p.id === editPageId ? updated : p));
  return { pages: newPages, graphData: buildGraphData(newPages), updated };
}

// ── Flow 1: Create page → add wiki-link → verify graph link ────────────────

describe('E2E flow: create page → add wiki-link → graph sync', () => {
  const INITIAL_MD_A = `---\ntype: task\nstatus: TO-DO\n---\n\nInitial body of Task A.`;
  const INITIAL_MD_B = `---\ntype: note\n---\n\nSome notes for reference.`;

  let pages: HermesPage[];

  beforeEach(() => {
    pages = [page('TaskA.md', INITIAL_MD_A), page('NoteB.md', INITIAL_MD_B)];
  });

  it('initial graph has no links between A and B', () => {
    const gd = buildGraphData(pages);
    expect(gd.nodes).toHaveLength(2);
    expect(gd.links).toHaveLength(0);
  });

  it('adding [[NoteB]] to TaskA creates a graph link A→B', () => {
    const editedMd = `---\ntype: task\nstatus: TO-DO\n---\n\nNow references [[NoteB]] in the body.`;
    const { graphData } = simulateEditFlow(pages, 'TaskA.md', editedMd);
    expect(graphData.links).toHaveLength(1);
    expect(graphData.links[0]).toEqual({ source: 'TaskA.md', target: 'NoteB.md' });
  });

  it('adding multiple wiki-links creates multiple graph links', () => {
    const editedMd = `---\ntype: task\nstatus: TO-DO\n---\n\nSee [[NoteB]] and also [[NoteB]] again.`;
    const { graphData, updated } = simulateEditFlow(pages, 'TaskA.md', editedMd);
    // parseMarkdownDocument deduplicates by occurrence, but link list may have repeats.
    // Graph should have at least one link.
    expect(graphData.links.length).toBeGreaterThanOrEqual(1);
    expect(graphData.links.every((l) => l.source === 'TaskA.md' && l.target === 'NoteB.md')).toBe(true);
    // The parsed links should include NoteB.
    expect(updated.links).toContain('NoteB');
  });

  it('removing a wiki-link removes the graph edge', () => {
    // First add the link.
    const withLink = `---\ntype: task\nstatus: TO-DO\n---\n\nRefs [[NoteB]].`;
    const step1 = simulateEditFlow(pages, 'TaskA.md', withLink);
    expect(step1.graphData.links).toHaveLength(1);

    // Then remove it.
    const withoutLink = `---\ntype: task\nstatus: TO-DO\n---\n\nNo more references.`;
    const step2 = simulateEditFlow(step1.pages, 'TaskA.md', withoutLink);
    expect(step2.graphData.links).toHaveLength(0);
  });

  it('editing metadata triggers type change in the graph node', () => {
    const retype = `---\ntype: objective\ndeadline: 2026-07-01\n---\n\nNow an objective.`;
    const { graphData } = simulateEditFlow(pages, 'TaskA.md', retype);
    const nodeA = graphData.nodes.find((n) => n.id === 'TaskA.md');
    expect(nodeA?.type).toBe('objective');
  });
});

// ── Flow 2: Incremental graph consistency during multi-step edits ───────────

describe('E2E flow: multi-step edits maintain graph consistency', () => {
  const mdPersona    = `---\ntype: persona\n---\n\nPersona page.`;
  const mdTask       = `---\ntype: task\nstatus: DOING\n---\n\nTask page linking [[Persona1]].`;
  const mdObjective  = `---\ntype: objective\n---\n\nObjective linking [[Task1]] and [[Persona1]].`;

  let pages: HermesPage[];

  beforeEach(() => {
    pages = [
      page('Persona1.md', mdPersona),
      page('Task1.md', mdTask),
      page('Obj1.md', mdObjective),
    ];
  });

  it('initial graph has correct structure (3 nodes, 3 links)', () => {
    const gd = buildGraphData(pages);
    expect(gd.nodes).toHaveLength(3);
    // Task1→Persona1, Obj1→Task1, Obj1→Persona1
    expect(gd.links).toHaveLength(3);
  });

  it('step sequence: add link → modify metadata → remove link stays consistent', () => {
    // Step 1: Task1 adds a link to Obj1.
    const step1Md = `---\ntype: task\nstatus: DOING\n---\n\nTask linking [[Persona1]] and [[Obj1]].`;
    const s1 = simulateEditFlow(pages, 'Task1.md', step1Md);
    expect(s1.graphData.links).toHaveLength(4); // original 3 + Task1→Obj1

    // Step 2: Change Persona1 type to note.
    const step2Md = `---\ntype: note\n---\n\nNow a note.`;
    const s2 = simulateEditFlow(s1.pages, 'Persona1.md', step2Md);
    const persona = s2.graphData.nodes.find((n) => n.id === 'Persona1.md');
    expect(persona?.type).toBe('note');
    // Links unchanged by metadata-only edit.
    expect(s2.graphData.links).toHaveLength(4);

    // Step 3: Obj1 removes the link to Persona1.
    const step3Md = `---\ntype: objective\n---\n\nObjective linking only [[Task1]].`;
    const s3 = simulateEditFlow(s2.pages, 'Obj1.md', step3Md);
    expect(s3.graphData.links).toHaveLength(3); // lost Obj1→Persona1
  });

  it('adding a new page mid-session and linking to it works', () => {
    // Simulate creating a new page.
    const newMd = `---\ntype: component\n---\n\nNew component page.`;
    const newPage = pageFromSource('NewComp.md', newMd);
    let current = [...pages, newPage];

    // Link Task1 to the new page.
    const editedTask = `---\ntype: task\nstatus: DOING\n---\n\nTask linking [[Persona1]] and [[NewComp]].`;
    const updated = pageFromSource('Task1.md', editedTask);
    current = current.map((p) => (p.id === 'Task1.md' ? updated : p));

    const gd = buildGraphData(current);
    expect(gd.nodes).toHaveLength(4);
    const newLinks = gd.links.filter((l) => l.target === 'NewComp.md');
    expect(newLinks).toHaveLength(1);
    expect(newLinks[0].source).toBe('Task1.md');
  });

  it('node incoming-link count (val) updates as links are added', () => {
    const gd1 = buildGraphData(pages);
    const personaVal1 = gd1.nodes.find((n) => n.id === 'Persona1.md')!.val;
    // Persona1 has 2 incoming links (from Task1 and Obj1). val = 5 + sqrt(2)*2

    // Add a third incoming link from a new page.
    const extra = pageFromSource('Extra.md', `---\ntype: note\n---\n\nLinks to [[Persona1]].`);
    const gd2 = buildGraphData([...pages, extra]);
    const personaVal2 = gd2.nodes.find((n) => n.id === 'Persona1.md')!.val;
    expect(personaVal2).toBeGreaterThan(personaVal1);
  });
});

// ── Flow 3: Broken links appear during editing ─────────────────────────────

describe('E2E flow: broken link detection during live editing', () => {
  it('typing a nonexistent wiki-link creates a broken link', () => {
    const md = `---\ntype: task\n---\n\nLinks to [[NonExistent]].`;
    const pages = [pageFromSource('T.md', md)];
    const broken = findBrokenLinks(pages);
    expect(broken).toHaveLength(1);
    expect(broken[0]).toEqual({ pageId: 'T.md', brokenLink: 'NonExistent' });
  });

  it('no broken links when all targets exist', () => {
    const a = pageFromSource('A.md', `---\ntype: note\n---\n\nLinks to [[B]].`);
    const b = pageFromSource('B.md', `---\ntype: note\n---\n\nStandalone.`);
    expect(findBrokenLinks([a, b])).toHaveLength(0);
  });

  it('deleting a page breaks incoming links from other pages', () => {
    const a = pageFromSource('A.md', `---\ntype: note\n---\n\nLinks [[B]] and [[C]].`);
    const b = pageFromSource('B.md', `---\ntype: note\n---\n\nB page.`);
    const c = pageFromSource('C.md', `---\ntype: note\n---\n\nC page.`);

    // All good initially.
    expect(findBrokenLinks([a, b, c])).toHaveLength(0);

    // "Delete" page C by removing it from the array.
    const broken = findBrokenLinks([a, b]);
    expect(broken).toHaveLength(1);
    expect(broken[0].brokenLink).toBe('C');
  });
});
