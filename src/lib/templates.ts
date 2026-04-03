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
    body: 'Description of this person and their role in the project.',
  },
  task: {
    type: 'task',
    label: 'Task',
    frontmatter: `---
type: task
status: TO-DO
priority: MEDIUM
deadline: ${new Date().toISOString().slice(0, 10)}
assignees:
dependencies:
---`,
    body: 'Describe the task objectives and acceptance criteria here.',
  },
  objective: {
    type: 'objective',
    label: 'Objective',
    frontmatter: `---
type: objective
deadline: ${new Date().toISOString().slice(0, 10)}
tasks:
dependencies:
stakeholders:
---`,
    body: 'Describe the objective, expected outcomes, and success metrics.',
  },
  component: {
    type: 'component',
    label: 'Component',
    frontmatter: `---
type: component
---`,
    body: 'Describe this system component, its responsibilities and interfaces.',
  },
  note: {
    type: 'note',
    label: 'Note',
    frontmatter: `---
type: note
---`,
    body: 'Free-form notes and observations.',
  },
};

export function generateMarkdown(type: PageType, title: string): string {
  const template = PAGE_TEMPLATES[type];
  return `${template.frontmatter}\n\n# ${title}\n\n${template.body}\n`;
}
