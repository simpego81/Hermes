/* Hermes page templates — predefined markdown templates for each category. */
import type { PageType } from './types';

export interface PageTemplate {
  type: PageType;
  label: string;
  frontmatter: string;
  body: string;
}

export const PAGE_TEMPLATES: Record<PageType, PageTemplate> = {
  persona: {
    type: 'persona',
    label: 'Persona',
    frontmatter: `---
type: persona
---`,
    body: '',
  },
  task: {
    type: 'task',
    label: 'Task',
    frontmatter: `---
type: task
status: TO-DO
priority: MEDIUM
assignees:
dependencies:
needed_for:
---`,
    body: '',
  },
  objective: {
    type: 'objective',
    label: 'Objective',
    frontmatter: `---
type: objective
deadline: 2026-12-31
tasks:
dependencies:
stakeholders:
---`,
    body: '',
  },
  component: {
    type: 'component',
    label: 'Component',
    frontmatter: `---
type: component
---`,
    body: '',
  },
  note: {
    type: 'note',
    label: 'Note',
    frontmatter: `---
type: note
---`,
    body: '',
  },
};

export function generateMarkdown(type: PageType, title: string): string {
  const template = PAGE_TEMPLATES[type];
  return `${template.frontmatter}\n\n# ${title}\n\n${template.body}\n`;
}
