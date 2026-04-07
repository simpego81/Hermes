/* Hermes Inspector — side panel for viewing and editing page metadata. */
import { useCallback, useMemo, useState } from 'react';
import type { HermesPage } from '../lib/types';
import { PAGE_COLORS, PAGE_TYPE_LABELS } from '../lib/types';
import { PAGE_SCHEMAS, validatePage } from '../lib/schema';
import type { SchemaField } from '../lib/schema';
import {
  findBacklinks,
  findBrokenLinks,
  getPersonaAggregates,
  getObjectiveAggregates,
} from '../lib/vault';
import type { BrokenLink } from '../lib/vault';

interface InspectorProps {
  page: HermesPage | null;
  pages: HermesPage[];
  onNavigate?: (title: string) => void;
  onRename?: (oldTitle: string, newTitle: string) => void;
  onDelete?: (id: string) => void;
}

function FieldEditor({
  def,
  value,
}: {
  def: SchemaField;
  value: string | string[] | undefined;
}) {
  const display = Array.isArray(value) ? value.join(', ') : (value ?? '—');

  if (def.type === 'enum' && def.options) {
    return (
      <div className="inspector-field">
        <label className="inspector-label">{def.label}</label>
        <span className="inspector-value inspector-enum">{display}</span>
      </div>
    );
  }

  return (
    <div className="inspector-field">
      <label className="inspector-label">{def.label}</label>
      <span className="inspector-value">{display}</span>
    </div>
  );
}

function ValidationBadge({ errors }: { errors: { field: string; message: string }[] }) {
  if (errors.length === 0) {
    return <span className="inspector-badge valid">✓ Valid</span>;
  }
  return (
    <div className="inspector-errors">
      {errors.map((e) => (
        <span key={e.field} className="inspector-badge error" title={e.message}>
          ⚠ {e.message}
        </span>
      ))}
    </div>
  );
}

export function Inspector({ page, pages, onNavigate, onRename, onDelete }: InspectorProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  const errors = useMemo(
    () => (page ? validatePage(page.type, page.metadata) : []),
    [page],
  );

  const backlinks = useMemo(
    () => (page ? findBacklinks(pages, page.title) : []),
    [pages, page],
  );

  const personaAgg = useMemo(
    () => (page?.type === 'persona' ? getPersonaAggregates(pages, page.title) : null),
    [pages, page],
  );

  const objectiveAgg = useMemo(
    () => (page?.type === 'objective' ? getObjectiveAggregates(pages, page) : null),
    [pages, page],
  );

  const brokenLinks = useMemo(
    () => (page ? findBrokenLinks(pages).filter((b) => b.pageId === page.id) : []),
    [pages, page],
  );

  if (!page) {
    return (
      <aside className="inspector">
        <div className="inspector-empty">
          <p>Select a page to inspect its metadata.</p>
        </div>
      </aside>
    );
  }

  const schema = PAGE_SCHEMAS[page.type];
  const schemaEntries = Object.entries(schema) as [string, SchemaField][];
  const extraKeys = Object.keys(page.metadata).filter(
    (k) => k !== 'type' && !(k in schema),
  );

  return (
    <aside className="inspector">
      <header className="inspector-header">
        <span
          className="type-dot"
          style={{ background: PAGE_COLORS[page.type] }}
          aria-hidden="true"
        />
        {editingTitle ? (
          <input
            className="inspector-title-input"
            value={titleDraft}
            autoFocus
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => {
              setEditingTitle(false);
              if (titleDraft.trim() && titleDraft !== page.title) {
                onRename?.(page.title, titleDraft.trim());
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                (e.target as HTMLInputElement).blur();
              }
              if (e.key === 'Escape') {
                setEditingTitle(false);
              }
            }}
          />
        ) : (
          <>
            <span
              className={`inspector-title${onRename ? ' editable' : ''}`}
              onDoubleClick={() => {
                if (onRename) {
                  setTitleDraft(page.title);
                  setEditingTitle(true);
                }
              }}
              title={onRename ? 'Double-click to rename' : undefined}
            >
              {page.title}
            </span>
            {onRename && (
              <button
                className="inspector-rename-btn"
                onClick={() => {
                  setTitleDraft(page.title);
                  setEditingTitle(true);
                }}
                title="Rename page"
                type="button"
              >
                ✎
              </button>
            )}
            {onDelete && (
              <button
                className="inspector-delete-btn"
                onClick={() => {
                  if (window.confirm(`Delete "${page.title}"? This cannot be undone.`)) {
                    onDelete(page.id);
                  }
                }}
                title="Delete page"
                type="button"
              >
                🗑
              </button>
            )}
          </>
        )}
      </header>

      <div className="inspector-type-badge" style={{ color: PAGE_COLORS[page.type] }}>
        {PAGE_TYPE_LABELS[page.type]}
      </div>

      <ValidationBadge errors={errors} />

      <section className="inspector-section">
        <h3 className="inspector-section-title">Properties</h3>
        {schemaEntries.map(([field, def]) => (
          <FieldEditor
            key={field}
            def={def}
            value={page.metadata[field]}
          />
        ))}
        {schemaEntries.length === 0 && (
          <p className="inspector-muted">No schema-defined properties for this type.</p>
        )}
      </section>

      {extraKeys.length > 0 && (
        <section className="inspector-section">
          <h3 className="inspector-section-title">Other metadata</h3>
          {extraKeys.map((key) => {
            const val = page.metadata[key];
            return (
              <div key={key} className="inspector-field">
                <label className="inspector-label">{key}</label>
                <span className="inspector-value">
                  {Array.isArray(val) ? val.join(', ') : (val ?? '—')}
                </span>
              </div>
            );
          })}
        </section>
      )}

      {page.links.length > 0 && (
        <section className="inspector-section">
          <h3 className="inspector-section-title">Outgoing links</h3>
          <ul className="inspector-links">
            {page.links.map((link) => (
              <li key={link} className="inspector-link-item">
                <button
                  className="inspector-link-btn"
                  onClick={() => onNavigate?.(link)}
                  type="button"
                >
                  [[{link}]]
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {backlinks.length > 0 && (
        <section className="inspector-section">
          <h3 className="inspector-section-title">Backlinks</h3>
          <ul className="inspector-links">
            {backlinks.map((title) => (
              <li key={title} className="inspector-link-item">
                <button
                  className="inspector-link-btn"
                  onClick={() => onNavigate?.(title)}
                  type="button"
                >
                  [[{title}]]
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {personaAgg && (
        <section className="inspector-section">
          <h3 className="inspector-section-title">Aggregates</h3>
          <div className="inspector-field">
            <label className="inspector-label">Tasks assigned</label>
            <span className="inspector-value">{personaAgg.taskCount}</span>
          </div>
          <div className="inspector-field">
            <label className="inspector-label">Objectives linked</label>
            <span className="inspector-value">{personaAgg.objectiveCount}</span>
          </div>
        </section>
      )}

      {objectiveAgg && (
        <section className="inspector-section">
          <h3 className="inspector-section-title">Task progress</h3>
          <div className="inspector-field">
            <label className="inspector-label">Completed</label>
            <span className="inspector-value">
              {objectiveAgg.completedTasks}/{objectiveAgg.totalTasks}
            </span>
          </div>
          <div className="inspector-progress-bar">
            <div
              className="inspector-progress-fill"
              style={{
                width: objectiveAgg.totalTasks
                  ? `${(objectiveAgg.completedTasks / objectiveAgg.totalTasks) * 100}%`
                  : '0%',
              }}
            />
          </div>
        </section>
      )}

      {brokenLinks.length > 0 && (
        <section className="inspector-section">
          <h3 className="inspector-section-title">⚠ Broken links</h3>
          <ul className="inspector-links">
            {brokenLinks.map((b) => (
              <li key={b.brokenLink} className="inspector-link-item inspector-broken-link">
                [[{b.brokenLink}]]
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
