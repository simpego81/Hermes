/* Hermes core type definitions for all page categories and graph data. */

export type PageType = 'persona' | 'task' | 'objective' | 'component' | 'note';

export const PAGE_COLORS: Record<PageType, string> = {
  persona: '#4fc3f7',
  task: '#ffb74d',
  objective: '#81c784',
  component: '#ce93d8',
  note: '#90a4ae',
};

export const PAGE_TYPE_LABELS: Record<PageType, string> = {
  persona: 'Persona',
  task: 'Task',
  objective: 'Objective',
  component: 'Component',
  note: 'Note',
};

export interface HermesPage {
  /** Relative path from vault root — used as unique key. */
  id: string;
  /** Filename without extension. */
  title: string;
  type: PageType;
  metadata: Record<string, string | string[]>;
  body: string;
  /** Titles referenced via [[wiki links]] in the body. */
  links: string[];
}

export interface GraphNode {
  id: string;
  label: string;
  type: PageType;
  /** Determines visual radius: base + incoming_links * scale. */
  val: number;
  x?: number;
  y?: number;
}

export interface GraphLink {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}
