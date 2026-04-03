/* Hermes breadcrumb navigation bar — shows visited page history (TASK-010). */
import type { HermesPage } from '../lib/types';
import { PAGE_COLORS } from '../lib/types';

export interface BreadcrumbsProps {
  /** Ordered back-stack of visited page IDs (most recent last). */
  history: string[];
  /** All pages in the vault (for title lookup). */
  pages: HermesPage[];
  /** Navigate to a page from the breadcrumb trail. */
  onNavigate(id: string): void;
  /** Go back one step. */
  onBack(): void;
}

export function Breadcrumbs({ history: hist, pages, onNavigate, onBack }: BreadcrumbsProps) {
  if (hist.length === 0) return null;

  const pageMap = new Map(pages.map((p) => [p.id, p]));

  // Show the last 6 entries to keep it compact.
  const visible = hist.slice(-6);
  const truncated = hist.length > 6;

  return (
    <nav className="breadcrumbs" aria-label="Page navigation history">
      <button
        className="breadcrumb-back"
        title="Go back"
        disabled={hist.length < 2}
        onClick={onBack}
        type="button"
      >
        ←
      </button>
      {truncated && <span className="breadcrumb-ellipsis">…</span>}
      {visible.map((id, i) => {
        const page = pageMap.get(id);
        const isLast = i === visible.length - 1;
        return (
          <span key={`${id}-${i}`} className="breadcrumb-item-wrapper">
            {i > 0 && <span className="breadcrumb-sep">›</span>}
            <button
              className={`breadcrumb-item${isLast ? ' active' : ''}`}
              style={
                isLast && page
                  ? { color: PAGE_COLORS[page.type] }
                  : undefined
              }
              onClick={() => onNavigate(id)}
              type="button"
              title={page?.title ?? id}
            >
              {page?.title ?? id}
            </button>
          </span>
        );
      })}
    </nav>
  );
}
