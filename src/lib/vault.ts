/* Hermes vault → graph data builder and demo dataset. */
import { parseMarkdownDocument } from './metadata';
import type { GraphData, GraphLink, GraphNode, HermesPage, PageType } from './types';

const KNOWN_TYPES = new Set<PageType>([
  'persona',
  'task',
  'objective',
  'component',
  'note',
]);
const BASE_NODE_SIZE = 5;
const LINK_SCALE = 2;

function resolveType(raw: string | string[] | undefined): PageType {
  const t = (typeof raw === 'string' ? raw : raw?.[0])?.toLowerCase();
  return KNOWN_TYPES.has(t as PageType) ? (t as PageType) : 'note';
}

export function pageFromSource(id: string, content: string): HermesPage {
  const parsed = parseMarkdownDocument(content);
  const title = id.replace(/\.md$/i, '').split(/[/\\]/).at(-1) ?? id;
  return {
    id,
    title,
    type: resolveType(parsed.metadata.type),
    metadata: parsed.metadata,
    body: parsed.body,
    links: parsed.links,
  };
}

export function buildGraphData(pages: HermesPage[]): GraphData {
  const byTitle = new Map(pages.map((p) => [p.title, p.id]));

  // Count incoming links per page id
  const incoming = new Map<string, number>();
  pages.forEach((page) =>
    page.links.forEach((linkTitle) => {
      const targetId = byTitle.get(linkTitle);
      if (targetId) incoming.set(targetId, (incoming.get(targetId) ?? 0) + 1);
    }),
  );

  const nodes: GraphNode[] = pages.map((p) => ({
    id: p.id,
    label: p.title,
    type: p.type,
    val: BASE_NODE_SIZE + Math.sqrt(incoming.get(p.id) ?? 0) * LINK_SCALE,
  }));

  const links: GraphLink[] = [];
  pages.forEach((page) =>
    page.links.forEach((linkTitle) => {
      const targetId = byTitle.get(linkTitle);
      if (targetId) links.push({ source: page.id, target: targetId });
    }),
  );

  return { nodes, links };
}

// ── Wiki-link integrity utilities (TASK-011) ──────────────────────────────────

export interface BrokenLink {
  /** Page that contains the unresolved link. */
  pageId: string;
  /** Wiki-link target title that does not match any page. */
  brokenLink: string;
}

/** Return every `[[wiki-link]]` in the vault that does not resolve to a page. */
export function findBrokenLinks(pages: HermesPage[]): BrokenLink[] {
  const titles = new Set(pages.map((p) => p.title));
  const broken: BrokenLink[] = [];
  for (const page of pages) {
    for (const link of page.links) {
      if (!titles.has(link)) {
        broken.push({ pageId: page.id, brokenLink: link });
      }
    }
  }
  return broken;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Rename a page and propagate the title change to every `[[wiki-link]]`
 * in the vault that referenced the old title.
 * Returns a new pages array (immutable).
 */
export function renamePage(
  pages: HermesPage[],
  oldTitle: string,
  newTitle: string,
): HermesPage[] {
  const re = new RegExp(`\\[\\[${escapeRegExp(oldTitle)}\\]\\]`, 'g');
  return pages.map((page) => {
    let updated = page;

    // Rename the page itself.
    if (page.title === oldTitle) {
      const newId = page.id.replace(
        new RegExp(`${escapeRegExp(oldTitle)}\\.md$`, 'i'),
        `${newTitle}.md`,
      );
      updated = { ...page, id: newId, title: newTitle };
    }

    // Update outgoing wiki-links in the body.
    if (updated.links.includes(oldTitle)) {
      const newBody = updated.body.replace(re, `[[${newTitle}]]`);
      const newLinks = updated.links.map((l) => (l === oldTitle ? newTitle : l));
      updated = { ...updated, body: newBody, links: newLinks };
    }

    return updated;
  });
}

// Demo vault rendered on first launch (no real vault selected)
export const DEMO_PAGES: HermesPage[] = [
  {
    id: 'Mario Rossi.md',
    title: 'Mario Rossi',
    type: 'persona',
    metadata: { type: 'persona' },
    body: 'Lead engineer responsible for core backend systems.',
    links: ['TASK-001', 'TASK-002', 'Hermes MVP'],
  },
  {
    id: 'Giulia Verdi.md',
    title: 'Giulia Verdi',
    type: 'persona',
    metadata: { type: 'persona' },
    body: 'Product designer overseeing UI and UX.',
    links: ['TASK-003', 'Hermes MVP'],
  },
  {
    id: 'TASK-001.md',
    title: 'TASK-001',
    type: 'task',
    metadata: { type: 'task', status: 'DOING', priority: 'HIGH', assignees: 'Mario Rossi' },
    body: 'Implement the Markdown parser and vault indexer.',
    links: ['Backend API'],
  },
  {
    id: 'TASK-002.md',
    title: 'TASK-002',
    type: 'task',
    metadata: { type: 'task', status: 'TO-DO', priority: 'MEDIUM', assignees: 'Mario Rossi' },
    body: 'Build the force-directed graph renderer.',
    links: ['Frontend App'],
  },
  {
    id: 'TASK-003.md',
    title: 'TASK-003',
    type: 'task',
    metadata: { type: 'task', status: 'DONE', priority: 'LOW', assignees: 'Giulia Verdi' },
    body: 'Design the sidebar and search UX.',
    links: ['Frontend App'],
  },
  {
    id: 'Hermes MVP.md',
    title: 'Hermes MVP',
    type: 'objective',
    metadata: { type: 'objective', deadline: '2026-06-01' },
    body: 'Ship the first public release of Hermes.',
    links: ['TASK-001', 'TASK-002', 'TASK-003'],
  },
  {
    id: 'Backend API.md',
    title: 'Backend API',
    type: 'component',
    metadata: { type: 'component' },
    body: 'Electron main-process file-system bridge and IPC layer.',
    links: [],
  },
  {
    id: 'Frontend App.md',
    title: 'Frontend App',
    type: 'component',
    metadata: { type: 'component' },
    body: 'React renderer — graph canvas, sidebar, metadata panel.',
    links: ['Backend API'],
  },
  {
    id: 'Architecture Notes.md',
    title: 'Architecture Notes',
    type: 'note',
    metadata: { type: 'note' },
    body: 'Notes on the overall system architecture and design decisions.',
    links: ['Backend API', 'Frontend App'],
  },
];
