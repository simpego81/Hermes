/* Hermes graph layout toolbar — Timeline view toggle. */
import type { LayoutMode } from '../lib/layout';

interface ToolbarProps {
  layoutMode: LayoutMode;
  onLayoutChange(mode: LayoutMode): void;
  laneRepulsion: number;
  onLaneRepulsionChange(value: number): void;
}

export function Toolbar({ layoutMode, onLayoutChange, laneRepulsion, onLaneRepulsionChange }: ToolbarProps) {
  function toggle(mode: LayoutMode) {
    onLayoutChange(layoutMode === mode ? 'free' : mode);
  }

  return (
    <div className="toolbar" role="toolbar" aria-label="Graph layout controls">
      {/* FEEDBACK012: Removed "Group by Category" button and category filter dropdown */}
      <button
        className={`toolbar-btn${layoutMode === 'timeline' ? ' active' : ''}`}
        onClick={() => toggle('timeline')}
        title="Arrange deadline pages on a timeline (click again to restore free layout)"
        type="button"
        aria-pressed={layoutMode === 'timeline'}
      >
        ⏱ Timeline View
      </button>
      {layoutMode === 'timeline' && (
        <label className="toolbar-slider-label" title="Repulsion force between nodes in the same category lane">
          <span>Repulsion</span>
          <input
            type="range"
            min={0}
            max={400}
            step={10}
            value={laneRepulsion}
            onChange={(e) => onLaneRepulsionChange(Number(e.target.value))}
          />
          <span className="toolbar-slider-value">{laneRepulsion}</span>
        </label>
      )}
    </div>
  );
}
