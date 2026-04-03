/* Toolbar layout-mode state machine tests (TASK-008 UI/UX Check).
   Tests the toggle logic that governs mode transitions in the Toolbar. */
import type { LayoutMode } from '../src/lib/layout';

// The Toolbar's toggle function (extracted as pure logic for testability):
// onLayoutChange(layoutMode === mode ? 'free' : mode)
function toggle(current: LayoutMode, pressed: LayoutMode): LayoutMode {
  return current === pressed ? 'free' : pressed;
}

// ── Single-step transitions ────────────────────────────────────────────────

describe('Toolbar toggle: single-step state transitions', () => {
  it('free → grouped when "Group by Category" is pressed', () => {
    expect(toggle('free', 'grouped')).toBe('grouped');
  });

  it('grouped → free when "Group by Category" is pressed again (deactivate)', () => {
    expect(toggle('grouped', 'grouped')).toBe('free');
  });

  it('free → timeline when "Timeline View" is pressed', () => {
    expect(toggle('free', 'timeline')).toBe('timeline');
  });

  it('timeline → free when "Timeline View" is pressed again (deactivate)', () => {
    expect(toggle('timeline', 'timeline')).toBe('free');
  });

  it('free → free is impossible via any button (pressing active=free is not exposed)', () => {
    // Neither button can be "active" when mode is free, so this case
    // cannot occur in the UI — but the logic is safe anyway:
    expect(toggle('free', 'free' as LayoutMode)).toBe('free');
  });
});

// ── Direct mode switches (without passing through 'free') ────────────────────

describe('Toolbar toggle: direct mode switch', () => {
  it('grouped → timeline when "Timeline View" is pressed while grouped is active', () => {
    expect(toggle('grouped', 'timeline')).toBe('timeline');
  });

  it('timeline → grouped when "Group by Category" is pressed while timeline is active', () => {
    expect(toggle('timeline', 'grouped')).toBe('grouped');
  });
});

// ── State machine sequences ────────────────────────────────────────────────

describe('Toolbar toggle: multi-step sequences', () => {
  it('free → grouped → free sequence', () => {
    let mode: LayoutMode = 'free';
    mode = toggle(mode, 'grouped');
    expect(mode).toBe('grouped');
    mode = toggle(mode, 'grouped');
    expect(mode).toBe('free');
  });

  it('free → timeline → free sequence', () => {
    let mode: LayoutMode = 'free';
    mode = toggle(mode, 'timeline');
    expect(mode).toBe('timeline');
    mode = toggle(mode, 'timeline');
    expect(mode).toBe('free');
  });

  it('free → grouped → timeline → free sequence (direct switch)', () => {
    let mode: LayoutMode = 'free';
    mode = toggle(mode, 'grouped');
    expect(mode).toBe('grouped');
    mode = toggle(mode, 'timeline'); // direct switch without intermediate 'free'
    expect(mode).toBe('timeline');
    mode = toggle(mode, 'timeline');
    expect(mode).toBe('free');
  });

  it('free → timeline → grouped → free sequence (direct switch)', () => {
    let mode: LayoutMode = 'free';
    mode = toggle(mode, 'timeline');
    expect(mode).toBe('timeline');
    mode = toggle(mode, 'grouped');
    expect(mode).toBe('grouped');
    mode = toggle(mode, 'grouped');
    expect(mode).toBe('free');
  });

  it('rapid toggling is idempotent: pressing same button twice always returns to free', () => {
    const modes: LayoutMode[] = ['grouped', 'timeline'];
    modes.forEach((m) => {
      let state: LayoutMode = 'free';
      state = toggle(state, m);  // activate
      state = toggle(state, m);  // deactivate
      expect(state).toBe('free');
    });
  });
});

// ── UI/UX state consistency ────────────────────────────────────────────────

describe('Toolbar UI/UX state consistency', () => {
  it('at most one mode can be active at a time', () => {
    // The toggle function always returns a single value — this is axiomatic,
    // but we verify all reachable states are valid LayoutMode values.
    const validModes: LayoutMode[] = ['free', 'grouped', 'timeline'];
    const allPresses: LayoutMode[] = ['grouped', 'timeline'];

    for (const current of validModes) {
      for (const pressed of allPresses) {
        const result = toggle(current, pressed);
        expect(validModes).toContain(result);
      }
    }
  });

  it('"free" mode is always reachable from any active mode in one press', () => {
    expect(toggle('grouped', 'grouped')).toBe('free');
    expect(toggle('timeline', 'timeline')).toBe('free');
  });

  it('pressing a different button from an active state never produces "free" directly', () => {
    // When grouped is active, pressing timeline → timeline (not free)
    expect(toggle('grouped', 'timeline')).toBe('timeline');
    // When timeline is active, pressing grouped → grouped (not free)
    expect(toggle('timeline', 'grouped')).toBe('grouped');
  });

  it('initial state "free" is reached from both active modes in one press', () => {
    const activeModes: LayoutMode[] = ['grouped', 'timeline'];
    activeModes.forEach((active) => {
      expect(toggle(active, active)).toBe('free');
    });
  });
});
