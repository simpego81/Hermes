/* Hermes metadata parser regression tests. */
import { parseMarkdownDocument } from '../src/lib/metadata';

describe('parseMarkdownDocument', () => {
  it('extracts scalar metadata and wiki links from the body', () => {
    const parsed = parseMarkdownDocument(`---
type: task
status: DONE
priority: HIGH
---

Linked to [[TASK-001]] and [[Objective Beta]].`);

    expect(parsed.metadata.type).toBe('task');
    expect(parsed.metadata.status).toBe('DONE');
    expect(parsed.links).toEqual(['TASK-001', 'Objective Beta']);
  });

  it('normalizes frontmatter values containing wiki links as arrays', () => {
    const parsed = parseMarkdownDocument(`---
assignees: [[Mario Rossi]], [[Giulia Verdi]]
dependencies: [[TASK-001]]
---

No extra links here.`);

    expect(parsed.metadata.assignees).toEqual(['Mario Rossi', 'Giulia Verdi']);
    expect(parsed.metadata.dependencies).toEqual(['TASK-001']);
    expect(parsed.links).toEqual([]);
  });
});
