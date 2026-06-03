# UI Verification Guide for Hermes

## Problem Statement

**Issue**: UI changes (particularly timeline layout, graph positioning, label placement) were previously marked as "resolved" without visual verification, leading to persistent bugs that were only discovered through manual testing.

**Root cause**: Claude Code cannot see the GUI without automation tools.

**Solution**: Automated E2E testing with Playwright for screenshot-based verification.

## Verification Workflow

### For Claude Code

When making **any UI change** (Graph, Timeline, Layout, Labels, Colors):

1. **Make code changes**
2. **Run E2E verification**:
   ```bash
   npm run test:e2e
   ```
3. **Review screenshots** in `test-results/screenshots/`
4. **Verify each visual aspect**:
   - ✅ Lane stratification correct?
   - ✅ Nodes positioned as expected?
   - ✅ Labels readable without severe overlap?
   - ✅ Colors match spec?
   - ✅ Draggability working as intended?
5. **Report findings** in verification summary
6. **ONLY THEN** mark task as resolved

### For User

When reporting UI issues:

1. **Open the test vault**: `tests/fixtures/test-vault/`
2. **Reproduce the issue** and take a screenshot
3. **Describe what's wrong** referencing the screenshot
4. Claude will fix and provide new screenshots for comparison

## Quick Start

### Run tests and view report
```bash
npm run test:e2e
npm run test:e2e:report
```

### Run tests in UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run tests with visible browser window
```bash
npm run test:e2e:headed
```

## Test Vault Structure

`tests/fixtures/test-vault/` contains:

- **Objective Alpha** (2026-08-15) - Early deadline
- **Objective Beta** (2026-12-01) - Late deadline  
- **Task With Deadline** (2026-07-01) - Linked to Obj Alpha
- **Task No Deadline** - Linked to Obj Alpha (tests draggability)
- **Component API** - Component type
- **Mario Rossi** - Persona type
- **Project Notes** - Note type

This covers:
- Deadline-based positioning ✅
- Depth-based positioning (via links) ✅
- Pinned vs draggable nodes ✅
- All page types and lanes ✅

## Screenshot Reference

| File | What to Check |
|------|---------------|
| `01-timeline-default.png` | Default timeline mode loads |
| `02-lane-stratification.png` | **CRITICAL**: Obj > Component > Task > Persona > Note vertical order |
| `03-deadline-positioning.png` | **CRITICAL**: Deadlines map to timeline X axis correctly |
| `05-pinned-nodes.png` | Nodes with deadlines cannot be dragged |
| `06-jitter-spacing.png` | Nodes without deadlines have random offset |
| `12-label-readability.png` | Labels don't overlap severely |

## Adding New Visual Tests

When implementing a new UI feature:

1. **Add test data** to test vault if needed
2. **Create new test** in `tests/e2e/<feature>.e2e.ts`
3. **Capture screenshots** at key states
4. **Document expected behavior** in test comments
5. **Update this guide** with new verification checklist

## Integration with /verify Skill

The `/verify` skill now:
1. Detects timeline/graph changes in diff
2. Runs `npm run test:e2e` automatically
3. Reviews screenshots
4. Reports visual findings
5. Flags when manual verification is needed

## Manual Verification Checklist

Use this when screenshots alone aren't conclusive:

### Timeline Mode
- [ ] Objectives appear above timeline axis
- [ ] Tasks appear below timeline axis  
- [ ] Persona/Component/Note appear at bottom
- [ ] Deadlines align with timeline dates
- [ ] Today marker visible (if in range)
- [ ] Depth offset visible (tasks left of their deadline)

### Draggability
- [ ] Nodes with deadlines: pinned (snap back when dragged)
- [ ] Nodes without deadlines: draggable (stay where dropped)

### Labels
- [ ] Node captions readable at default zoom
- [ ] Deadline dates visible
- [ ] No complete overlap (some slight overlap OK if readable)

### Layout Modes
- [ ] Timeline: horizontal axis with lanes
- [ ] Grouped: category boxes in grid
- [ ] Free: force-directed, no constraints

## Troubleshooting

### Tests fail to launch Electron
```bash
# Rebuild the app first
npm run build
npm run test:e2e
```

### Screenshots don't show changes
- Check if test vault is loaded correctly
- Verify D3 simulation had time to settle (wait longer)
- Check if viewport is correct size

### Canvas interactions don't work
- Canvas drag testing is limited by coordinate precision
- Use manual verification for complex interactions
- Document what was tested manually in verification report

## Success Criteria

A UI change is **verified** when:

✅ E2E tests pass
✅ Screenshots show expected visual behavior  
✅ Manual checks (if needed) confirm interactive behavior
✅ No regressions in other layout modes
✅ Documentation updated if new visual pattern introduced

## Notes for Future Improvements

Potential enhancements:
- Visual regression testing (snapshot comparison)
- Automated drag & drop testing with pixel-perfect coordinates
- Accessibility testing (contrast, screen reader labels)
- Performance profiling (FPS during animation)
