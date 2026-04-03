/* Hermes root application shell (TASK-009 editor + TASK-010 split layout). */
import { useCallback, useMemo, useRef, useState } from 'react';
import { Breadcrumbs } from './components/Breadcrumbs';
import { Editor } from './components/Editor';
import { Graph } from './components/Graph';
import { Inspector } from './components/Inspector';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import type { LayoutMode } from './lib/layout';
import { pageFromSource, buildGraphData, DEMO_PAGES } from './lib/vault';
import type { HermesPage } from './lib/types';

export default function App() {
  const [pages, setPages] = useState<HermesPage[]>(DEMO_PAGES);
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('free');
  const [navHistory, setNavHistory] = useState<string[]>([]);
  const [showGraph, setShowGraph] = useState(true);

  // Suppress history-push when navigating via breadcrumbs or back-button.
  const suppressHistoryRef = useRef(false);

  const graphData = useMemo(() => buildGraphData(pages), [pages]);

  const selectedPage = useMemo(
    () => pages.find((p) => p.id === selectedId) ?? null,
    [pages, selectedId],
  );

  const pageTitles = useMemo(() => pages.map((p) => p.title), [pages]);

  // ── Page selection with history tracking ────────────────────────────────
  const selectPage = useCallback(
    (id: string) => {
      setSelectedId(id);
      if (!suppressHistoryRef.current) {
        setNavHistory((prev) => {
          // Avoid duplicate consecutive entries.
          if (prev[prev.length - 1] === id) return prev;
          return [...prev, id];
        });
      }
      suppressHistoryRef.current = false;
    },
    [],
  );

  // Breadcrumb: navigate to a specific point in history.
  const breadcrumbNavigate = useCallback(
    (id: string) => {
      suppressHistoryRef.current = true;
      setSelectedId(id);
      setNavHistory((prev) => {
        const idx = prev.lastIndexOf(id);
        return idx >= 0 ? prev.slice(0, idx + 1) : [...prev, id];
      });
    },
    [],
  );

  // Breadcrumb: go back one step.
  const goBack = useCallback(() => {
    setNavHistory((prev) => {
      if (prev.length < 2) return prev;
      const next = prev.slice(0, -1);
      suppressHistoryRef.current = true;
      setSelectedId(next[next.length - 1]);
      return next;
    });
  }, []);

  // ── Editor content change → metadata sync + auto-save ───────────────────
  const handleEditorChange = useCallback(
    (newContent: string) => {
      if (!selectedId) return;

      // Reparse page metadata from the new markdown source.
      const updated = pageFromSource(selectedId, newContent);
      setPages((prev) =>
        prev.map((p) => (p.id === selectedId ? updated : p)),
      );

      // Auto-save to file system (non-blocking).
      if (vaultPath && window.hermesDesktop?.vault?.writeFile) {
        window.hermesDesktop.vault
          .writeFile(vaultPath, selectedId, newContent)
          .catch(() => {
            /* silently ignore write failures in demo mode */
          });
      }
    },
    [selectedId, vaultPath],
  );

  // ── Vault opening ───────────────────────────────────────────────────────
  const openVault = useCallback(async () => {
    if (!window.hermesDesktop?.vault) return;
    setLoading(true);
    try {
      const dir = await window.hermesDesktop.vault.openDialog();
      if (!dir) return;
      const files = await window.hermesDesktop.vault.readFiles(dir);
      const loaded = files.map((f: VaultFile) => pageFromSource(f.path, f.content));
      setPages(loaded.length > 0 ? loaded : DEMO_PAGES);
      setVaultPath(dir);
      setSelectedId(null);
      setSearchQuery('');
      setNavHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Reconstruct raw markdown from current HermesPage (for editor) ───────
  const editorContent = useMemo(() => {
    if (!selectedPage) return '';
    const meta = selectedPage.metadata;
    const hasMetadata = Object.keys(meta).length > 0;
    const frontmatter = hasMetadata
      ? `---\n${Object.entries(meta)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.map((l) => `[[${l}]]`).join(', ') : v}`)
          .join('\n')}\n---\n`
      : '';
    return `${frontmatter}\n${selectedPage.body}`;
  }, [selectedPage]);

  return (
    <div className="app-layout">
      {/* ── Left: sidebar file explorer ─────────────────────────────────── */}
      <Sidebar
        pages={pages}
        selectedId={selectedId}
        searchQuery={searchQuery}
        vaultPath={vaultPath}
        onPageSelect={selectPage}
        onSearchChange={setSearchQuery}
        onOpenVault={() => void openVault()}
      />

      {/* ── Center: editor area ─────────────────────────────────────────── */}
      <section className="editor-area">
        <div className="editor-topbar">
          <Breadcrumbs
            history={navHistory}
            pages={pages}
            onNavigate={breadcrumbNavigate}
            onBack={goBack}
          />
          <button
            className={`toggle-graph-btn${showGraph ? ' active' : ''}`}
            onClick={() => setShowGraph((v) => !v)}
            title={showGraph ? 'Hide graph panel' : 'Show graph panel'}
            type="button"
          >
            {showGraph ? '◩ Hide Graph' : '◧ Show Graph'}
          </button>
        </div>
        {selectedPage ? (
          <Editor
            content={editorContent}
            pageTitles={pageTitles}
            onChange={handleEditorChange}
          />
        ) : (
          <div className="editor-placeholder">
            Select a page to start editing
          </div>
        )}
      </section>

      {/* ── Right: graph + inspector (collapsible) ──────────────────────── */}
      {showGraph && (
        <section className="graph-panel">
          <main className="graph-area">
            <Toolbar layoutMode={layoutMode} onLayoutChange={setLayoutMode} />
            {loading && <div className="loading-overlay">Loading vault…</div>}
            <Graph
              data={graphData}
              pages={pages}
              selectedId={selectedId}
              layoutMode={layoutMode}
              onNodeClick={selectPage}
            />
          </main>
          <Inspector page={selectedPage} />
        </section>
      )}
    </div>
  );
}
