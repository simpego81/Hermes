/* Hermes root application shell. */
import { StatusBoard } from './components/StatusBoard';
import { parseMarkdownDocument } from './lib/metadata';

const sampleDocument = `---
type: task
status: TO-DO
priority: HIGH
assignees: [[Mario Rossi]], [[Giulia Verdi]]
---

Ship the first Hermes milestone with references to [[TASK-001]] and [[Objective Alpha]].`;

const parsedDocument = parseMarkdownDocument(sampleDocument);

export default function App() {
  return (
    <main className="app-shell">
      <section className="hero-panel">
        <p className="eyebrow">Hermes / Vault Intelligence</p>
        <h1>Graph-native project delivery workspace.</h1>
        <p className="lede">
          The baseline repository now includes Electron, React, linting,
          formatting, Jest coverage, and GitHub Actions-ready quality gates.
        </p>
      </section>

      <section className="content-grid">
        <StatusBoard />

        <article className="card">
          <h2>Markdown Metadata Preview</h2>
          <dl className="metadata-list">
            {Object.entries(parsedDocument.metadata).map(([key, value]) => (
              <div key={key} className="metadata-row">
                <dt>{key}</dt>
                <dd>{Array.isArray(value) ? value.join(', ') : value}</dd>
              </div>
            ))}
          </dl>
        </article>

        <article className="card">
          <h2>Linked Entities</h2>
          <ul className="link-list">
            {parsedDocument.links.map((link) => (
              <li key={link}>{link}</li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}
