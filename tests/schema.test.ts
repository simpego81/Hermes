/* Metadata schema validation tests (TASK-005).
   Covers validatePage() for all page types, required-field errors,
   enum mismatches, invalid date formats, and fallback behaviour. */
import { validatePage } from '../src/lib/schema';

// ---------------------------------------------------------------------------
// Task pages
// ---------------------------------------------------------------------------

describe('validatePage — task', () => {
  it('passes a fully valid task with no errors', () => {
    const errors = validatePage('task', {
      status: 'IN PROGRESS',
      priority: 'HIGH',
      deadline: '2026-06-01',
      assignees: ['Alice'],
      dependencies: ['TASK-001'],
    });
    expect(errors).toHaveLength(0);
  });

  it('reports an error when required "status" is missing', () => {
    const errors = validatePage('task', { priority: 'HIGH' });
    expect(errors.some((e) => e.field === 'status')).toBe(true);
  });

  it('reports an error when required "priority" is missing', () => {
    const errors = validatePage('task', { status: 'TO-DO' });
    expect(errors.some((e) => e.field === 'priority')).toBe(true);
  });

  it('reports both required-field errors when status and priority are absent', () => {
    const errors = validatePage('task', {});
    const fields = errors.map((e) => e.field);
    expect(fields).toContain('status');
    expect(fields).toContain('priority');
  });

  it('reports an enum error for an invalid status value', () => {
    const errors = validatePage('task', { status: 'PENDING', priority: 'LOW' });
    const statusError = errors.find((e) => e.field === 'status');
    expect(statusError).toBeDefined();
    expect(statusError!.message).toMatch(/PENDING/);
  });

  it('reports an enum error for an invalid priority value', () => {
    const errors = validatePage('task', { status: 'TO-DO', priority: 'URGENT' });
    const priorityError = errors.find((e) => e.field === 'priority');
    expect(priorityError).toBeDefined();
    expect(priorityError!.message).toMatch(/URGENT/);
  });

  it('reports a date error for a non-ISO-8601 deadline', () => {
    const errors = validatePage('task', {
      status: 'DONE',
      priority: 'LOW',
      deadline: '01/06/2026',
    });
    const dateError = errors.find((e) => e.field === 'deadline');
    expect(dateError).toBeDefined();
    expect(dateError!.message).toMatch(/YYYY-MM-DD/);
  });

  it('accepts valid optional deadline and emits no error', () => {
    const errors = validatePage('task', {
      status: 'TO-DO',
      priority: 'MEDIUM',
      deadline: '2026-12-31',
    });
    expect(errors.find((e) => e.field === 'deadline')).toBeUndefined();
  });

  it('treats optional assignees/dependencies as no error when absent', () => {
    const errors = validatePage('task', { status: 'TO-DO', priority: 'LOW' });
    expect(errors.some((e) => e.field === 'assignees')).toBe(false);
    expect(errors.some((e) => e.field === 'dependencies')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Task status values (TASK-034)
// ---------------------------------------------------------------------------

describe('validatePage — task status values (TASK-034)', () => {
  const validStatuses = ['TO-DO', 'WAITING', 'ANALYZING', 'IN PROGRESS', 'READY', 'DONE'];

  it.each(validStatuses)('accepts valid status "%s"', (status) => {
    const errors = validatePage('task', { status, priority: 'LOW' });
    const statusErr = errors.find((e) => e.field === 'status');
    expect(statusErr).toBeUndefined();
  });

  const invalidStatuses = ['DOING', 'BLOCKED', 'PENDING', 'OPEN', 'CLOSED', 'doing', ''];

  it.each(invalidStatuses.filter(Boolean))('rejects old/invalid status "%s"', (status) => {
    const errors = validatePage('task', { status, priority: 'LOW' });
    const statusErr = errors.find((e) => e.field === 'status');
    expect(statusErr).toBeDefined();
    expect(statusErr!.message).toContain(status);
  });
});

// ---------------------------------------------------------------------------
// WAITING conditional validation (TASK-034)
// ---------------------------------------------------------------------------

describe('validatePage — WAITING conditional rule (TASK-034)', () => {
  it('WAITING without blocked_by or assignees generates an error', () => {
    const errors = validatePage('task', { status: 'WAITING', priority: 'HIGH' });
    const blockerErr = errors.find((e) => e.field === 'blocked_by');
    expect(blockerErr).toBeDefined();
    expect(blockerErr!.message).toMatch(/WAITING/i);
  });

  it('WAITING with blocked_by (array) passes', () => {
    const errors = validatePage('task', {
      status: 'WAITING',
      priority: 'HIGH',
      blocked_by: ['Alice'],
    });
    expect(errors.find((e) => e.field === 'blocked_by')).toBeUndefined();
  });

  it('WAITING with blocked_by (string) passes', () => {
    const errors = validatePage('task', {
      status: 'WAITING',
      priority: 'HIGH',
      blocked_by: 'Bob',
    });
    expect(errors.find((e) => e.field === 'blocked_by')).toBeUndefined();
  });

  it('WAITING with assignees (array) passes', () => {
    const errors = validatePage('task', {
      status: 'WAITING',
      priority: 'HIGH',
      assignees: ['Carol'],
    });
    expect(errors.find((e) => e.field === 'blocked_by')).toBeUndefined();
  });

  it('WAITING with assignees (string) passes', () => {
    const errors = validatePage('task', {
      status: 'WAITING',
      priority: 'HIGH',
      assignees: 'Dave',
    });
    expect(errors.find((e) => e.field === 'blocked_by')).toBeUndefined();
  });

  it('WAITING with empty blocked_by and empty assignees still errors', () => {
    const errors = validatePage('task', {
      status: 'WAITING',
      priority: 'HIGH',
      blocked_by: [],
      assignees: [],
    });
    expect(errors.find((e) => e.field === 'blocked_by')).toBeDefined();
  });

  it('WAITING with whitespace-only blocked_by still errors', () => {
    const errors = validatePage('task', {
      status: 'WAITING',
      priority: 'HIGH',
      blocked_by: '  ',
    });
    expect(errors.find((e) => e.field === 'blocked_by')).toBeDefined();
  });

  it('non-WAITING statuses do not trigger the blocked_by rule', () => {
    for (const status of ['TO-DO', 'ANALYZING', 'IN PROGRESS', 'READY', 'DONE']) {
      const errors = validatePage('task', { status, priority: 'LOW' });
      expect(errors.find((e) => e.field === 'blocked_by')).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Objective pages
// ---------------------------------------------------------------------------

describe('validatePage — objective', () => {
  it('passes a valid objective with all optional fields', () => {
    const errors = validatePage('objective', {
      deadline: '2026-09-01',
      tasks: ['TASK-001', 'TASK-002'],
      stakeholders: ['Alice'],
    });
    expect(errors).toHaveLength(0);
  });

  it('passes an objective with no metadata (all optional)', () => {
    expect(validatePage('objective', {})).toHaveLength(0);
  });

  it('reports a date error for a malformed deadline', () => {
    const errors = validatePage('objective', { deadline: '2026/09/01' });
    expect(errors.some((e) => e.field === 'deadline')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Persona pages
// ---------------------------------------------------------------------------

describe('validatePage — persona', () => {
  it('passes with no metadata (all optional)', () => {
    expect(validatePage('persona', {})).toHaveLength(0);
  });

  it('passes with tasks_count and objectives_count present', () => {
    const errors = validatePage('persona', {
      tasks_count: '3',
      objectives_count: '1',
    });
    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Component and Note pages (no required fields, empty schema)
// ---------------------------------------------------------------------------

describe('validatePage — component', () => {
  it('always passes with empty metadata', () => {
    expect(validatePage('component', {})).toHaveLength(0);
  });

  it('always passes with arbitrary extra metadata', () => {
    expect(validatePage('component', { version: '1.0', owner: 'Alice' })).toHaveLength(0);
  });
});

describe('validatePage — note', () => {
  it('always passes with empty metadata', () => {
    expect(validatePage('note', {})).toHaveLength(0);
  });

  it('always passes with arbitrary metadata', () => {
    expect(validatePage('note', { tags: 'ideas', draft: 'true' })).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('validatePage — edge cases', () => {
  it('treats an empty string value as missing for required fields', () => {
    const errors = validatePage('task', { status: '', priority: 'HIGH' });
    expect(errors.some((e) => e.field === 'status')).toBe(true);
  });

  it('handles array enum values by inspecting the first element', () => {
    const errors = validatePage('task', {
      status: ['DONE'],
      priority: ['HIGH'],
    });
    expect(errors).toHaveLength(0);
  });
});
