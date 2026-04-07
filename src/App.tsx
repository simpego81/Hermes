/* Hermes root application shell (TASK-009 editor + TASK-010 split layout). */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Breadcrumbs } from './components/Breadcrumbs';
import { Editor } from './components/Editor';
import { Graph } from './components/Graph';
import { Inspector } from './components/Inspector';
import { Sidebar } from './components/Sidebar';
import { TaskList } from './components/TaskList';
import { Toolbar } from './components/Toolbar';
import { CommandPalette } from './components/CommandPalette';
import { CreationWizard } from './components/CreationWizard';
import type { PaletteCommand } from './components/CommandPalette';
import type { LayoutMode } from './lib/layout';
import { pageFromSource, buildGraphData, renamePage, DEMO_PAGES } from './lib/vault';
import { generateMarkdown } from './lib/templates';
import type { HermesPage, PageType } from './lib/types';

export default function App() {
  const [pages, setPages] = useState<HermesPage[]>(DEMO_PAGES);
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('free');
  const [groupFilter, setGroupFilter] = useState<PageType | null>(null);
  const [navHistory, setNavHistory] = useState<string[]>([]);
  const [navForward, setNavForward] = useState<string[]>([]);
  const [showGraph, setShowGraph] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardPrefilledName, setWizardPrefilledName] = useState<string | null>(null);
  const [quickOpenOpen, setQuickOpenOpen] = useState(false);

  // Suppress history-push when navigating via breadcrumbs or back-button.
  const suppressHistoryRef = useRef(false);

  const graphData = useMemo(() => buildGraphData(pages), [pages]);

  const selectedPage = useMemo(
    () => pages.find((p) => p.id === selectedId) ?? null,
    [pages, selectedId],
  );

  const pageTitles = useMemo(() => pages.map((p) => p.title), [pages]);
  const personaTitles = useMemo(() => pages.filter((p) => p.type === 'persona').map((p) => p.title), [pages]);

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
        setNavForward([]); // Clear forward stack on new navigation.
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
      const current = prev[prev.length - 1];
      setNavForward((fwd) => [current, ...fwd]);
      const next = prev.slice(0, -1);
      suppressHistoryRef.current = true;
      setSelectedId(next[next.length - 1]);
      return next;
    });
  }, []);

  // Go forward one step (Alt+Right).
  const goForward = useCallback(() => {
    setNavForward((fwd) => {
      if (fwd.length === 0) return fwd;
      const [nextId, ...rest] = fwd;
      suppressHistoryRef.current = true;
      setNavHistory((prev) => [...prev, nextId]);
      setSelectedId(nextId);
      return rest;
    });
  }, []);

  // Navigate by page title (used by Inspector backlinks / outgoing links).
  const navigateByTitle = useCallback(
    (title: string) => {
      const target = pages.find((p) => p.title === title);
      if (target) selectPage(target.id);
    },
    [pages, selectPage],
  );

  // ── Rename page from Inspector (TASK-018 Req 3, TASK-028 IPC) ───────────
  const handleRenamePage = useCallback(
    async (oldTitle: string, newTitle: string) => {
      if (!newTitle.trim() || oldTitle === newTitle) return;
      const oldId = pages.find((p) => p.title === oldTitle)?.id;
      const newId = `${newTitle}.md`;

      // Rename file on disk when running in Electron
      if (vaultPath && oldId && window.hermesDesktop?.vault?.renameFile) {
        try {
          await window.hermesDesktop.vault.renameFile(vaultPath, oldId, newId);
        } catch (err) {
          console.error('Failed to rename file:', err);
        }
      }

      setPages((prev) => {
        const updated = renamePage(prev, oldTitle, newTitle);
        // Update selectedId if the renamed page was selected.
        const renamedPage = updated.find((p) => p.title === newTitle);
        if (renamedPage && selectedId && pages.find((p) => p.id === selectedId)?.title === oldTitle) {
          setSelectedId(renamedPage.id);
        }
        return updated;
      });
    },
    [selectedId, pages, vaultPath],
  );

  // ── Delete page (TASK-028) ──────────────────────────────────────────────
  const handleDeletePage = useCallback(
    async (id: string) => {
      // Delete file from disk when running in Electron
      if (vaultPath && window.hermesDesktop?.vault?.deleteFile) {
        try {
          await window.hermesDesktop.vault.deleteFile(vaultPath, id);
        } catch (err) {
          console.error('Failed to delete file:', err);
        }
      }

      setPages((prev) => prev.filter((p) => p.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
      }
    },
    [vaultPath, selectedId],
  );

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

  // ── Ctrl+Enter: cycle task status (TASK-014) ───────────────────────────
  const TASK_STATUS_CYCLE = ['TO-DO', 'WAITING', 'ANALYZING', 'IN PROGRESS', 'READY', 'DONE'] as const;

  const handleCycleStatus = useCallback(() => {
    if (!selectedPage || selectedPage.type !== 'task') return;
    const current = (selectedPage.metadata.status as string) ?? 'TO-DO';
    const idx = TASK_STATUS_CYCLE.indexOf(current as typeof TASK_STATUS_CYCLE[number]);
    const next = TASK_STATUS_CYCLE[(idx + 1) % TASK_STATUS_CYCLE.length];
    setPages((prev) =>
      prev.map((p) =>
        p.id === selectedPage.id
          ? { ...p, metadata: { ...p.metadata, status: next } }
          : p,
      ),
    );
  }, [selectedPage]);

  // ── Vault opening ───────────────────────────────────────────────────────
  const openVault = useCallback(async () => {
    if (!window.hermesDesktop?.vault) return;
    setLoading(true);
    try {
      const dir = await window.hermesDesktop.vault.openDialog();
      if (!dir) return;
      const files = await window.hermesDesktop.vault.readFiles(dir);
      const loaded = files.map((f: VaultFile) => pageFromSource(f.path, f.content));
      setPages(loaded);
      setVaultPath(dir);
      setSelectedId(null);
      setSearchQuery('');
      setNavHistory([]);
      setNavForward([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Page Creation via Wizard (TASK-023) ──────────────────────────────────
  const openWizard = useCallback(() => {
    // Only require vaultPath when running inside Electron with desktop API
    if (window.hermesDesktop?.vault && !vaultPath) {
      alert('Please open a vault first to create a new page.');
      return;
    }
    setWizardOpen(true);
  }, [vaultPath]);

  const handleWizardConfirm = useCallback(
    async (name: string, type: PageType) => {
      setWizardOpen(false);
      const newPageId = `${name}.md`;
      const newContent = generateMarkdown(type, name);
      const newPage = pageFromSource(newPageId, newContent);

      // Persist to disk if running in Electron
      if (vaultPath && window.hermesDesktop?.vault?.writeFile) {
        try {
          await window.hermesDesktop.vault.writeFile(vaultPath, newPageId, newContent);
        } catch (err) {
          console.error('Failed to create page:', err);
        }
      }

      setPages((prev) => [...prev, newPage]);
      setSelectedId(newPageId);
    },
    [vaultPath],
  );

  // ── Command Palette (TASK-013) ──────────────────────────────────────────
  const paletteCommands = useMemo<PaletteCommand[]>(
    () => [
      { id: 'cmd:toggle-graph', label: 'Toggle Graph', action: () => setShowGraph((v) => !v) },
      { id: 'cmd:new-page', label: 'New Page', action: () => openWizard() },
      { id: 'cmd:open-vault', label: 'Open Vault', action: () => void openVault() },
    ],
    [openWizard, openVault],
  );

  // ── Ctrl+Click on wiki-link in editor (TASK-036 Req 3) ──────────────────
  const handleLinkClick = useCallback(
    (title: string) => {
      const target = pages.find((p) => p.title === title);
      if (target) {
        selectPage(target.id);
      } else {
        // Page doesn't exist — open wizard with pre-filled name, ask only type
        setWizardPrefilledName(title);
        setWizardOpen(true);
      }
    },
    [pages, selectPage],
  );

  // Global keyboard shortcuts (TASK-013 + TASK-014 + TASK-036 + TASK-042).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        openWizard();
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'O') {
        e.preventDefault();
        void openVault();
      }
      if (e.ctrlKey && !e.shiftKey && e.key === 'o') {
        e.preventDefault();
        setQuickOpenOpen((v) => !v);
      }
      if (e.ctrlKey && e.key === 'g') {
        e.preventDefault();
        setShowGraph((v) => !v);
      }
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        setSelectedId(null);
      }
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        goBack();
      }
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        goForward();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goBack, goForward, openWizard, openVault]);

  // ── Menu Event Registration ─────────────────────────────────────────────
  useEffect(() => {
    const api = window.hermesDesktop;
    if (!api) return;

    api.onMenuNewPage(() => openWizard());
    api.onMenuOpenVault(() => void openVault());
    api.onMenuSavePage(() => {
      // Auto-save is already debounced on change, but Ctrl+S can force an immediate flush if we had a dirty flag.
      // For now, it serves as a "success" confirmation or manual trigger.
    });
    api.onMenuSearchVault(() => {
      const searchInput = document.querySelector('.sidebar-search input') as HTMLInputElement;
      searchInput?.focus();
    });
    api.onMenuClosePage(() => {
      setSelectedId(null);
    });
  }, [openWizard, openVault]);

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
        onDelete={handleDeletePage}
      />

      {/* ── Center: graph (top) + editor (bottom) ───────────────────────── */}
      <section className="center-area">
        {showGraph && (
          <div className="center-graph">
            <main className="graph-area">
              <Toolbar layoutMode={layoutMode} onLayoutChange={setLayoutMode} groupFilter={groupFilter} onGroupFilterChange={setGroupFilter} />
              {loading && <div className="loading-overlay">Loading vault…</div>}
              <Graph
                data={graphData}
                pages={pages}
                selectedId={selectedId}
                layoutMode={layoutMode}
                groupFilter={groupFilter}
                onNodeClick={selectPage}
              />
            </main>
          </div>
        )}

        <div className="center-editor">
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
              personaTitles={personaTitles}
              onChange={handleEditorChange}
              onCycleStatus={handleCycleStatus}
              onLinkClick={handleLinkClick}
            />
          ) : (
            <div className="editor-placeholder">
              Select a page to start editing
            </div>
          )}
        </div>
      </section>

      {/* ── Right: Task List + Inspector ─────────────────────────────────── */}
      <aside className="right-panel">
        <TaskList pages={pages} selectedId={selectedId} onSelect={selectPage} />
        <Inspector page={selectedPage} pages={pages} onNavigate={navigateByTitle} onRename={handleRenamePage} onDelete={handleDeletePage} />
      </aside>

      {/* ── Quick Open modal (TASK-036 Req 1) ────────────────────────── */}
      {quickOpenOpen && (
        <CommandPalette
          pages={pages}
          commands={[]}
          onNavigate={(id) => { selectPage(id); setQuickOpenOpen(false); }}
          onClose={() => setQuickOpenOpen(false)}
        />
      )}

      {/* ── Command Palette modal (TASK-013) ────────────────────────────── */}
      {paletteOpen && (
        <CommandPalette
          pages={pages}
          commands={paletteCommands}
          onNavigate={(id) => { selectPage(id); setPaletteOpen(false); }}
          onClose={() => setPaletteOpen(false)}
        />
      )}

      {/* ── Creation Wizard modal (TASK-023) ────────────────────────────── */}
      {wizardOpen && (
        <CreationWizard
          prefilledName={wizardPrefilledName}
          onConfirm={handleWizardConfirm}
          onClose={() => { setWizardOpen(false); setWizardPrefilledName(null); }}
        />
      )}
    </div>
  );
}
