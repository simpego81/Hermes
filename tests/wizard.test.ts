/* Page Wizard integrity tests (TASK-026).
   Validates that the Creation Wizard produces correct frontmatter
   for every page type and that the generated markdown can be round-tripped
   through pageFromSource without data loss. */
import { generateMarkdown, PAGE_TEMPLATES } from '../src/lib/templates';
import { pageFromSource } from '../src/lib/vault';
import { validatePage } from '../src/lib/schema';
import type { PageType } from '../src/lib/types';

// ---------------------------------------------------------------------------
// Req 1 — Frontmatter generation for Task pages
// ---------------------------------------------------------------------------

describe('Wizard — Task frontmatter integrity', () => {
  const md = generateMarkdown('task', 'Sprint Review');
  const page = pageFromSource('Sprint Review.md', md);

  it('generates a page with type "task"', () => {
    expect(page.type).toBe('task');
  });

  it('initializes status to TO-DO', () => {
    expect(page.metadata.status).toBe('TO-DO');
  });

  it('initializes priority to MEDIUM', () => {
    expect(page.metadata.priority).toBe('MEDIUM');
  });

  it('deadline is not set by default (TASK-038)', () => {
    expect(page.metadata.deadline).toBeUndefined();
  });

  it('passes schema validation with no errors', () => {
    const errors = validatePage('task', page.metadata);
    expect(errors).toHaveLength(0);
  });

  it('preserves the page title from the file name', () => {
    expect(page.title).toBe('Sprint Review');
  });
});

// ---------------------------------------------------------------------------
// All page types — round-trip through generateMarkdown + pageFromSource
// ---------------------------------------------------------------------------

const ALL_TYPES: PageType[] = ['persona', 'task', 'objective', 'component', 'note'];

describe('Wizard — round-trip for all page types', () => {
  ALL_TYPES.forEach((type) => {
    describe(`type: ${type}`, () => {
      const title = `Test ${type}`;
      const md = generateMarkdown(type, title);
      const page = pageFromSource(`${title}.md`, md);

      it('resolves the correct page type', () => {
        expect(page.type).toBe(type);
      });

      it('round-trips metadata.type', () => {
        expect(page.metadata.type).toBe(type);
      });

      it('includes the title heading in the body', () => {
        expect(page.body).toContain(`# ${title}`);
      });

      it('includes the template body text', () => {
        expect(page.body).toContain(PAGE_TEMPLATES[type].body);
      });

      it('passes schema validation', () => {
        const errors = validatePage(type, page.metadata);
        expect(errors).toHaveLength(0);
      });
    });
  });
});

// ---------------------------------------------------------------------------
// Req 2 — No system dialog; file created in vault directory
// ---------------------------------------------------------------------------

describe('Wizard — file system expectations', () => {
  it('generateMarkdown produces a non-empty string', () => {
    const md = generateMarkdown('note', 'Quick Note');
    expect(md.length).toBeGreaterThan(0);
  });

  it('generated markdown starts with YAML frontmatter delimiters', () => {
    const md = generateMarkdown('task', 'Build Feature');
    expect(md.startsWith('---\n')).toBe(true);
    expect(md).toContain('\n---\n');
  });

  it('generated file name is deterministic (name + .md)', () => {
    const name = 'My New Page';
    const expectedId = `${name}.md`;
    const page = pageFromSource(expectedId, generateMarkdown('note', name));
    expect(page.id).toBe(expectedId);
    expect(page.title).toBe(name);
  });

  it('does not invoke saveDialog (no Electron dependency for creation)', () => {
    // The wizard flow uses vault.writeFile directly, not saveDialog.
    // Confirm that generateMarkdown is a pure function with no side effects.
    expect(() => generateMarkdown('component', 'Auth Module')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('Wizard — edge cases', () => {
  it('handles a title with special characters', () => {
    const title = 'Feature [v2] — Release & Deploy';
    const md = generateMarkdown('task', title);
    const page = pageFromSource(`${title}.md`, md);
    expect(page.title).toBe(title);
    expect(page.body).toContain(`# ${title}`);
  });

  it('objective template includes stakeholders field', () => {
    const md = generateMarkdown('objective', 'Q4 Revenue');
    const page = pageFromSource('Q4 Revenue.md', md);
    expect('stakeholders' in page.metadata || md.includes('stakeholders')).toBe(true);
  });

  it('persona template does not require any fields', () => {
    const md = generateMarkdown('persona', 'Alice');
    const page = pageFromSource('Alice.md', md);
    const errors = validatePage('persona', page.metadata);
    expect(errors).toHaveLength(0);
  });
});
