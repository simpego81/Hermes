/* Hermes Inspector — side panel for viewing and editing page metadata. */
import { useMemo } from 'react';
import type { HermesPage } from '../lib/types';
import { PAGE_COLORS, PAGE_TYPE_LABELS } from '../lib/types';
import { PAGE_SCHEMAS, validatePage } from '../lib/schema';
import type { SchemaField } from '../lib/schema';

interface InspectorProps {
  page: HermesPage | null;
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

export function Inspector({ page }: InspectorProps) {
  const errors = useMemo(
    () => (page ? validatePage(page.type, page.metadata) : []),
    [page],
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
        <span className="inspector-title">{page.title}</span>
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
                [[{link}]]
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
