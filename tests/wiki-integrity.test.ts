/* Wiki-link integrity tests (TASK-011 Req 3).
   Tests broken-link detection, rename propagation, and
   graph consistency after title changes. */
import {
  pageFromSource,
  buildGraphData,
  findBrokenLinks,
  renamePage,
} from '../src/lib/vault';
import type { HermesPage } from '../src/lib/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function mkPage(id: string, md: string): HermesPage {
  return pageFromSource(id, md);
}

function vault(...specs: [string, string][]): HermesPage[] {
  return specs.map(([id, md]) => mkPage(id, md));
}

// ── findBrokenLinks ─────────────────────────────────────────────────────────

describe('findBrokenLinks', () => {
  it('returns empty for a vault with no links', () => {
    const pages = vault(
      ['a.md', `---\ntype: note\n---\n\nNo links here.`],
      ['b.md', `---\ntype: note\n---\n\nAlso no links.`],
    );
    expect(findBrokenLinks(pages)).toEqual([]);
  });

  it('returns empty when all links resolve', () => {
    const pages = vault(
      ['a.md', `---\ntype: note\n---\n\nLinks to [[b]].`],
      ['b.md', `---\ntype: note\n---\n\nLinks to [[a]].`],
    );
    expect(findBrokenLinks(pages)).toEqual([]);
  });

  it('detects a single broken link', () => {
    const pages = vault(
      ['a.md', `---\ntype: note\n---\n\nLinks to [[ghost]].`],
    );
    const broken = findBrokenLinks(pages);
    expect(broken).toHaveLength(1);
    expect(broken[0]).toEqual({ pageId: 'a.md', brokenLink: 'ghost' });
  });

  it('detects multiple broken links in one page', () => {
    const pages = vault(
      ['a.md', `---\ntype: note\n---\n\nLinks [[x]] and [[y]].`],
    );
    const broken = findBrokenLinks(pages);
    expect(broken).toHaveLength(2);
    expect(broken.map((b) => b.brokenLink).sort()).toEqual(['x', 'y']);
  });

  it('detects broken links across multiple pages', () => {
    const pages = vault(
      ['a.md', `---\ntype: note\n---\n\n[[missing1]]`],
      ['b.md', `---\ntype: note\n---\n\n[[missing2]]`],
      ['c.md', `---\ntype: note\n---\n\nNo bad links.`],
    );
    const broken = findBrokenLinks(pages);
    expect(broken).toHaveLength(2);
    expect(broken.map((b) => b.pageId).sort()).toEqual(['a.md', 'b.md']);
  });

  it('a mix of valid and broken links in one page', () => {
    const pages = vault(
      ['a.md', `---\ntype: note\n---\n\n[[b]] and [[gone]].`],
      ['b.md', `---\ntype: note\n---\n\nB page.`],
    );
    const broken = findBrokenLinks(pages);
    expect(broken).toHaveLength(1);
    expect(broken[0]).toEqual({ pageId: 'a.md', brokenLink: 'gone' });
  });

  it('self-referencing link is not broken (page title exists)', () => {
    const pages = vault(
      ['a.md', `---\ntype: note\n---\n\nI reference myself [[a]].`],
    );
    expect(findBrokenLinks(pages)).toEqual([]);
  });
});

// ── renamePage ──────────────────────────────────────────────────────────────

describe('renamePage', () => {
  it('renames the target page title and id', () => {
    const pages = vault(
      ['Old Name.md', `---\ntype: note\n---\n\nOld page.`],
    );
    const result = renamePage(pages, 'Old Name', 'New Name');
    expect(result[0].title).toBe('New Name');
    expect(result[0].id).toBe('New Name.md');
  });

  it('updates wiki-links in other pages that referenced the old title', () => {
    const pages = vault(
      ['page-a.md', `---\ntype: note\n---\n\nSee [[Target]].`],
      ['Target.md', `---\ntype: task\n---\n\nTarget page.`],
    );
    const result = renamePage(pages, 'Target', 'Renamed');

    // Page A's link should now point to 'Renamed'.
    expect(result[0].links).toContain('Renamed');
    expect(result[0].links).not.toContain('Target');

    // Page A's body should have [[Renamed]].
    expect(result[0].body).toContain('[[Renamed]]');
    expect(result[0].body).not.toContain('[[Target]]');

    // The renamed page itself.
    expect(result[1].title).toBe('Renamed');
    expect(result[1].id).toBe('Renamed.md');
  });

  it('does not modify pages that have no references to the old title', () => {
    const pages = vault(
      ['unrelated.md', `---\ntype: note\n---\n\nNo links here.`],
      ['Target.md', `---\ntype: note\n---\n\nTarget.`],
    );
    const result = renamePage(pages, 'Target', 'NewTarget');
    expect(result[0].body).toBe('No links here.');
    expect(result[0].links).toEqual([]);
  });

  it('handles multiple pages referencing the renamed page', () => {
    const pages = vault(
      ['a.md', `---\ntype: note\n---\n\n[[Target]] link.`],
      ['b.md', `---\ntype: note\n---\n\n[[Target]] here too.`],
      ['Target.md', `---\ntype: note\n---\n\nTarget page.`],
    );
    const result = renamePage(pages, 'Target', 'Better Name');
    expect(result[0].links).toContain('Better Name');
    expect(result[1].links).toContain('Better Name');
    expect(result[2].title).toBe('Better Name');
  });

  it('handles a page that links to the old title multiple times', () => {
    const pages = vault(
      ['multi.md', `---\ntype: note\n---\n\n[[X]] and again [[X]] and once more [[X]].`],
      ['X.md', `---\ntype: note\n---\n\nX page.`],
    );
    const result = renamePage(pages, 'X', 'Y');
    expect(result[0].body).toBe('[[Y]] and again [[Y]] and once more [[Y]].');
    expect(result[0].links.filter((l) => l === 'Y')).toHaveLength(3);
    expect(result[0].links.filter((l) => l === 'X')).toHaveLength(0);
  });

  it('preserves page type and other metadata after rename', () => {
    const pages = vault(
      ['Old.md', `---\ntype: task\nstatus: DOING\npriority: HIGH\n---\n\nBody.`],
    );
    const result = renamePage(pages, 'Old', 'New');
    expect(result[0].type).toBe('task');
    expect(result[0].metadata.status).toBe('DOING');
    expect(result[0].metadata.priority).toBe('HIGH');
  });

  it('escapes regex special chars in old title', () => {
    const pages = vault(
      ['ref.md', `---\ntype: note\n---\n\nLink [[C++ (lib)]].`],
      ['C++ (lib).md', `---\ntype: component\n---\n\nC++ library.`],
    );
    const result = renamePage(pages, 'C++ (lib)', 'cpp-lib');
    expect(result[0].links).toContain('cpp-lib');
    expect(result[0].body).toContain('[[cpp-lib]]');
    expect(result[1].title).toBe('cpp-lib');
  });
});

// ── Graph consistency after rename ──────────────────────────────────────────

describe('Graph consistency after renamePage', () => {
  it('graph links remain valid after a rename', () => {
    const pages = vault(
      ['a.md', `---\ntype: note\n---\n\nLink [[b]].`],
      ['b.md', `---\ntype: note\n---\n\nLink [[a]].`],
    );

    // Before rename: two reciprocal links.
    const gd1 = buildGraphData(pages);
    expect(gd1.links).toHaveLength(2);
    expect(findBrokenLinks(pages)).toHaveLength(0);

    // Rename b → beta.
    const renamed = renamePage(pages, 'b', 'beta');
    const gd2 = buildGraphData(renamed);

    // Graph should still have two reciprocal links with updated ids.
    expect(gd2.links).toHaveLength(2);
    expect(findBrokenLinks(renamed)).toHaveLength(0);

    const betaNode = gd2.nodes.find((n) => n.label === 'beta');
    expect(betaNode).toBeDefined();
    expect(gd2.nodes.find((n) => n.label === 'b')).toBeUndefined();
  });

  it('renaming a page that nobody links to produces zero broken links', () => {
    const pages = vault(
      ['isolated.md', `---\ntype: note\n---\n\nLoner page.`],
      ['other.md', `---\ntype: note\n---\n\nAnother page.`],
    );
    const renamed = renamePage(pages, 'isolated', 'renamed');
    expect(findBrokenLinks(renamed)).toHaveLength(0);
  });

  it('without renamePage, simple title change creates broken links', () => {
    const pages = vault(
      ['a.md', `---\ntype: note\n---\n\nLink [[b]].`],
      ['b.md', `---\ntype: note\n---\n\nB page.`],
    );

    // Manually change b's title without propagating links (simulates raw rename).
    const manualRename: HermesPage[] = pages.map((p) =>
      p.id === 'b.md' ? { ...p, id: 'beta.md', title: 'beta' } : p,
    );

    // a still holds [[b]] which no longer resolves.
    const broken = findBrokenLinks(manualRename);
    expect(broken).toHaveLength(1);
    expect(broken[0]).toEqual({ pageId: 'a.md', brokenLink: 'b' });

    // But using renamePage instead would fix it.
    const properRename = renamePage(pages, 'b', 'beta');
    expect(findBrokenLinks(properRename)).toHaveLength(0);
  });

  it('chain of renames keeps the graph fully connected', () => {
    const pages = vault(
      ['hub.md', `---\ntype: note\n---\n\n[[spoke1]] [[spoke2]] [[spoke3]]`],
      ['spoke1.md', `---\ntype: note\n---\n\n[[hub]]`],
      ['spoke2.md', `---\ntype: note\n---\n\n[[hub]]`],
      ['spoke3.md', `---\ntype: note\n---\n\n[[hub]]`],
    );

    let current = pages;
    current = renamePage(current, 'spoke1', 'alpha');
    current = renamePage(current, 'spoke2', 'beta');
    current = renamePage(current, 'spoke3', 'gamma');

    expect(findBrokenLinks(current)).toHaveLength(0);

    const gd = buildGraphData(current);
    // hub→alpha, hub→beta, hub→gamma, alpha→hub, beta→hub, gamma→hub
    expect(gd.links).toHaveLength(6);
    expect(gd.nodes.map((n) => n.label).sort()).toEqual([
      'alpha', 'beta', 'gamma', 'hub',
    ]);
  });
});
