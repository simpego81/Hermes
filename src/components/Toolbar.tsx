/* Hermes graph layout toolbar — toggles for Group by Category and Timeline. */
import type { LayoutMode } from '../lib/layout';

interface ToolbarProps {
  layoutMode: LayoutMode;
  onLayoutChange(mode: LayoutMode): void;
}

export function Toolbar({ layoutMode, onLayoutChange }: ToolbarProps) {
  function toggle(mode: LayoutMode) {
    onLayoutChange(layoutMode === mode ? 'free' : mode);
  }

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
    </div>
  );
}
