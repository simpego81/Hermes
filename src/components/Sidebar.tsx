/* Hermes navigation sidebar: vault selector, search, grouped page list. */
import type { HermesPage, PageType } from '../lib/types';
import { PAGE_COLORS, PAGE_TYPE_LABELS } from '../lib/types';

const TYPE_ORDER: PageType[] = [
  'task',
  'objective',
  'persona',
  'component',
  'note',
];

interface SidebarProps {
  pages: HermesPage[];
  selectedId: string | null;
  searchQuery: string;
  vaultPath: string | null;
  onPageSelect(id: string): void;
  onSearchChange(query: string): void;
  onOpenVault(): void;
  onDelete?(id: string): void;
}

export function Sidebar({
  pages,
  selectedId,
  searchQuery,
  vaultPath,
  onPageSelect,
  onSearchChange,
  onOpenVault,
  onDelete,
}: SidebarProps) {
  const lc = searchQuery.toLowerCase();
  const filtered = searchQuery
    ? pages.filter((p) => p.title.toLowerCase().includes(lc))
    : pages;

  const grouped = TYPE_ORDER.reduce<Record<PageType, HermesPage[]>>(
    (acc, type) => {
      acc[type] = filtered.filter((p) => p.type === type);
      return acc;
    },
    { task: [], objective: [], persona: [], component: [], note: [] },
  );

  const vaultLabel = vaultPath ? vaultPath.split(/[/\\]/).at(-1) : null;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-logo">◈ Hermes</span>
        <button className="btn-open-vault" onClick={onOpenVault} type="button">
          {vaultPath ? '↺ Change' : '⊕ Open Vault'}
        </button>
      </div>

      {vaultLabel && (
        <p className="vault-path" title={vaultPath ?? undefined}>
          {vaultLabel}
        </p>
      )}

      <div className="sidebar-search">
        <input
          type="search"
          placeholder="Search pages…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search pages"
        />
      </div>

      <nav className="sidebar-nav" aria-label="Page navigation">
        {TYPE_ORDER.map((type) => {
          const group = grouped[type];
          if (group.length === 0) return null;
          return (
            <section key={type} className="nav-group">
              <header className="nav-group-header">
                <span
                  className="type-dot"
                  style={{ background: PAGE_COLORS[type] }}
                  aria-hidden="true"
                />
                {PAGE_TYPE_LABELS[type]}
                <span className="type-count">{group.length}</span>
              </header>
              <ul>
                {group.map((page) => (
                  <li
                    key={page.id}
                    className={`nav-item${selectedId === page.id ? ' active' : ''}`}
                    onClick={() => onPageSelect(page.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') onPageSelect(page.id);
                    }}
                    onContextMenu={(e) => {
                      if (!onDelete) return;
                      e.preventDefault();
                      if (window.confirm(`Delete "${page.title}"?`)) {
                        onDelete(page.id);
                      }
                    }}
                    aria-current={selectedId === page.id ? 'page' : undefined}
                  >
                    {page.title}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </nav>
    </aside>
  );
}
