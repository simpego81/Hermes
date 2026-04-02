/* Hermes root application shell. */
import { useCallback, useMemo, useState } from 'react';
import { Graph } from './components/Graph';
import { Sidebar } from './components/Sidebar';
import { buildGraphData, DEMO_PAGES, pageFromSource } from './lib/vault';
import type { HermesPage } from './lib/types';

export default function App() {
  const [pages, setPages] = useState<HermesPage[]>(DEMO_PAGES);
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const graphData = useMemo(() => buildGraphData(pages), [pages]);

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
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="app-layout">
      <Sidebar
        pages={pages}
        selectedId={selectedId}
        searchQuery={searchQuery}
        vaultPath={vaultPath}
        onPageSelect={setSelectedId}
        onSearchChange={setSearchQuery}
        onOpenVault={() => void openVault()}
      />
      <main className="graph-area">
        {loading && <div className="loading-overlay">Loading vault…</div>}
        <Graph
          data={graphData}
          selectedId={selectedId}
          onNodeClick={setSelectedId}
        />
      </main>
    </div>
  );
}
