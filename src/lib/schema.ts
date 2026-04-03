/* Hermes schema validation — validates frontmatter metadata per page type. */
import type { PageType } from './types';

export interface ValidationError {
  field: string;
  message: string;
}

export interface SchemaField {
  required: boolean;
  label: string;
  type: 'string' | 'enum' | 'date' | 'links';
  options?: string[];
}

export type SchemaDefinition = Record<string, SchemaField>;

const TASK_STATUSES = ['TO-DO', 'DOING', 'DONE', 'BLOCKED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const PAGE_SCHEMAS: Record<PageType, SchemaDefinition> = {
  persona: {
    tasks_count: { required: false, label: 'Tasks count', type: 'string' },
    objectives_count: { required: false, label: 'Objectives count', type: 'string' },
  },
  task: {
    status: { required: true, label: 'Status', type: 'enum', options: TASK_STATUSES },
    deadline: { required: false, label: 'Deadline', type: 'date' },
    priority: { required: true, label: 'Priority', type: 'enum', options: PRIORITIES },
    assignees: { required: false, label: 'Assignees', type: 'links' },
    dependencies: { required: false, label: 'Dependencies', type: 'links' },
  },
  objective: {
    tasks: { required: false, label: 'Tasks', type: 'links' },
    dependencies: { required: false, label: 'Dependencies', type: 'links' },
    deadline: { required: false, label: 'Deadline', type: 'date' },
    stakeholders: { required: false, label: 'Stakeholders', type: 'links' },
  },
  component: {},
  note: {},
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validatePage(
  type: PageType,
  metadata: Record<string, string | string[]>,
): ValidationError[] {
  const schema = PAGE_SCHEMAS[type];
  const errors: ValidationError[] = [];

  for (const [field, def] of Object.entries(schema)) {
    const value = metadata[field];

    if (def.required && (value === undefined || value === '')) {
      errors.push({ field, message: `"${def.label}" is required for ${type} pages.` });
      continue;
    }

    if (value === undefined || value === '') continue;

    if (def.type === 'enum' && def.options) {
      const scalar = typeof value === 'string' ? value : value[0];
      if (!def.options.includes(scalar)) {
        errors.push({
          field,
          message: `"${def.label}" must be one of: ${def.options.join(', ')}. Got "${scalar}".`,
        });
      }
    }

    if (def.type === 'date') {
      const scalar = typeof value === 'string' ? value : value[0];
      if (!ISO_DATE_RE.test(scalar)) {
        errors.push({
          field,
          message: `"${def.label}" must be a valid date (YYYY-MM-DD). Got "${scalar}".`,
        });
      }
    }
  }

  return errors;
}
