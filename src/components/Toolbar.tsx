/* Hermes graph layout toolbar — toggles for Group by Category and Timeline. */
import type { LayoutMode } from '../lib/layout';
import { BOX_TYPE_ORDER } from '../lib/layout';
import { PAGE_TYPE_LABELS } from '../lib/types';
import type { PageType } from '../lib/types';

interface ToolbarProps {
  layoutMode: LayoutMode;
  onLayoutChange(mode: LayoutMode): void;
  groupFilter: PageType | null;
  onGroupFilterChange(filter: PageType | null): void;
}

export function Toolbar({ layoutMode, onLayoutChange, groupFilter, onGroupFilterChange }: ToolbarProps) {
  function toggle(mode: LayoutMode) {
    onLayoutChange(layoutMode === mode ? 'free' : mode);
    if (layoutMode === mode) onGroupFilterChange(null); // reset filter when leaving mode
  }

  const showFilter = layoutMode === 'grouped' || layoutMode === 'timeline';

  return (
    <div className="toolbar" role="toolbar" aria-label="Graph layout controls">
      <button
        className={`toolbar-btn${layoutMode === 'grouped' ? ' active' : ''}`}
        onClick={() => toggle('grouped')}
        title="Group nodes by category (click again to restore free layout)"
        type="button"
        aria-pressed={layoutMode === 'grouped'}
      >
        ⊞ Group by Category
      </button>
      <button
        className={`toolbar-btn${layoutMode === 'timeline' ? ' active' : ''}`}
        onClick={() => toggle('timeline')}
        title="Arrange deadline pages on a timeline (click again to restore free layout)"
        type="button"
        aria-pressed={layoutMode === 'timeline'}
      >
        ⏱ Timeline View
      </button>
      {showFilter && (
        <select
          className="toolbar-select"
          value={groupFilter ?? ''}
          onChange={(e) => onGroupFilterChange(e.target.value === '' ? null : e.target.value as PageType)}
          title="Filter layout to a single category"
        >
          <option value="">All Categories</option>
          {BOX_TYPE_ORDER.map((t) => (
            <option key={t} value={t}>{PAGE_TYPE_LABELS[t]}</option>
          ))}
        </select>
      )}
    </div>
  );
}
