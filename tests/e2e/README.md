# E2E Tests for Hermes UI Verification

## Overview

This directory contains Playwright E2E tests for visual verification of UI changes, particularly timeline and graph layout features. These tests help prevent declaring UI fixes as "resolved" without actual visual confirmation.

## Purpose

**Problem**: UI changes (like FEEDBACK011 timeline improvements) were marked as resolved without visual verification, leading to persistent visual bugs.

**Solution**: Automated E2E tests that:
- Launch the Electron app
- Load a test vault with known data
- Capture screenshots at key states
- Allow manual visual inspection of UI behavior

## Test Vault

The test vault (`tests/fixtures/test-vault/`) contains:
- **Objective Alpha** (deadline: 2026-08-15)
- **Objective Beta** (deadline: 2026-12-01)
- **Task With Deadline** (deadline: 2026-07-01) → linked to Objective Alpha
- **Task No Deadline** → linked to Objective Alpha (tests draggability)
- **Component API**
- **Mario Rossi** (persona)
- **Project Notes**

This setup tests:
✅ Deadline-based positioning
✅ Depth-based positioning (tasks linked to objectives)
✅ Draggable vs pinned nodes
✅ Lane stratification (Obj > Component > Task > Persona > Note)
✅ Jitter for non-deadline nodes

## Running Tests

### Run all E2E tests with screenshots
```bash
npm run test:e2e
```

### Run tests in UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser window)
```bash
npm run test:e2e:headed
```

### View test report
```bash
npm run test:e2e:report
```

## Screenshot Output

Screenshots are saved to `test-results/screenshots/`:

| Screenshot | Purpose |
|------------|---------|
| `01-timeline-default.png` | Initial timeline mode state |
| `02-lane-stratification.png` | Vertical lane ordering |
| `03-deadline-positioning.png` | Nodes positioned by deadline |
| `04-before-drag.png` | Before drag attempt |
| `05-pinned-nodes.png` | Nodes with deadlines (should be pinned) |
| `06-jitter-spacing.png` | Non-deadline nodes with jitter |
| `07-full-width-timeline.png` | Timeline spanning full canvas |
| `08-11-*.png` | Mode switching (Timeline/Grouped/Free) |
| `12-label-readability.png` | Label placement and readability |

## Verification Workflow

When making UI changes:

1. **Make your code changes**
2. **Run E2E tests**: `npm run test:e2e`
3. **Review screenshots** in `test-results/screenshots/`
4. **Manual checks**:
   - Are lanes stratified correctly?
   - Are deadlines positioned on timeline?
   - Are labels readable?
   - Do nodes with deadlines stay pinned?
   - Do nodes without deadlines have jitter?
5. **Only then** mark the task as resolved

## Adding New Tests

To add a new E2E test:

1. Create a new `.e2e.ts` file in `tests/e2e/`
2. Use the `timeline-layout.e2e.ts` as a template
3. Add test vault data to `tests/fixtures/test-vault/` if needed
4. Document expected visual outcomes in test comments
5. Add screenshot capture at key verification points

## Limitations

⚠️ **Canvas interaction**: Dragging nodes on canvas requires pixel-perfect coordinate calculation. Current tests capture screenshots for manual verification rather than automated drag testing.

⚠️ **Force simulation**: D3 force simulation has random elements (jitter, collision resolution). Screenshots may vary slightly between runs.

## Integration with Verify Skill

These tests integrate with Claude Code's `/verify` skill:
- Run tests to generate screenshots
- Inspect screenshots to confirm UI behavior
- Report findings in verification results
- Prevent false PASS verdicts on UI changes
