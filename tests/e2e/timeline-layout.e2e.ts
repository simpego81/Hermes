/**
 * E2E tests for Timeline layout verification (FEEDBACK011)
 *
 * Tests visual layout, node positioning, draggability, and lane stratification
 * in timeline mode with screenshots for manual verification.
 */
import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_VAULT_PATH = path.resolve(__dirname, '../fixtures/test-vault');
const SCREENSHOT_DIR = path.resolve(__dirname, '../../test-results/screenshots');

let electronApp: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  // Launch Electron app with test vault path
  // Do NOT pass VITE_DEV_SERVER_URL so Electron uses production build from dist/
  const testEnv: Record<string, string> = {
    ...process.env as Record<string, string>,
    NODE_ENV: 'test',
    HERMES_TEST_VAULT_PATH: TEST_VAULT_PATH,
  };
  // Remove VITE_DEV_SERVER_URL to force production mode
  delete testEnv.VITE_DEV_SERVER_URL;

  // Launch Electron with explicit path to compiled main.js
  const mainPath = path.resolve(__dirname, '../../dist-electron/main.js');

  electronApp = await electron.launch({
    args: [mainPath],
    env: testEnv,
    timeout: 60000,
  });

  // Get the first window
  page = await electronApp.firstWindow();
  await page.waitForLoadState('domcontentloaded');

  // Wait for vault to auto-load
  await page.waitForTimeout(3000); // Allow time for vault loading and D3 simulation
});

test.afterAll(async () => {
  await electronApp.close();
});

test.describe('Timeline Layout (FEEDBACK011)', () => {
  test.beforeEach(async () => {
    // Vault is already auto-loaded in beforeAll via HERMES_TEST_VAULT_PATH
    // Just ensure canvas is visible and simulation has settled
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(1500); // Allow D3 simulation to settle
  });

  test('should display timeline mode by default', async () => {
    // Verify timeline mode is active
    const toolbarText = await page.textContent('[data-testid="layout-mode"]');
    expect(toolbarText).toContain('Timeline');

    // Take screenshot of initial state
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-timeline-default.png'),
      fullPage: true,
    });
  });

  test('should stratify lanes: Objective > Component > Task > Persona > Note', async () => {
    // Get canvas element for visual verification
    const canvas = await page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    // Take screenshot showing lane stratification
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02-lane-stratification.png'),
      fullPage: true,
    });

    // Visual verification checklist (manual):
    // 1. Objectives at top (above timeline axis)
    // 2. Components in second lane
    // 3. Tasks in third lane
    // 4. Personas in fourth lane
    // 5. Notes at bottom
  });

  test('should position nodes with deadlines on timeline axis', async () => {
    // Screenshot showing deadline positioning
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '03-deadline-positioning.png'),
      fullPage: true,
    });

    // Visual checks (manual):
    // - "Objective Alpha" (2026-08-15) positioned correctly
    // - "Objective Beta" (2026-12-01) to the right of Alpha
    // - "Task With Deadline" (2026-07-01) positioned by deadline with depth offset
    // - Today marker visible if within range
  });

  test('should allow dragging nodes without deadlines', async () => {
    // Try to drag "Task No Deadline" node
    // First, we need to find the node on canvas
    // This requires canvas interaction which is complex

    // For now, take before/after screenshots
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '04-before-drag.png'),
      fullPage: true,
    });

    // Attempt drag interaction (requires canvas coordinates)
    // This is a placeholder - actual drag requires finding node position
    // await page.mouse.move(x, y);
    // await page.mouse.down();
    // await page.mouse.move(x + 100, y + 50);
    // await page.mouse.up();

    // Manual verification:
    // - Nodes with deadlines should NOT be draggable (pinned)
    // - Nodes without deadlines SHOULD be draggable
  });

  test('should prevent dragging nodes with deadlines', async () => {
    // Screenshot showing pinned nodes
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '05-pinned-nodes.png'),
      fullPage: true,
    });

    // Manual verification:
    // - "Objective Alpha", "Objective Beta", "Task With Deadline" are pinned
    // - Attempting to drag them should fail (they snap back)
  });

  test('should apply jitter to non-deadline nodes to prevent overlap', async () => {
    // Screenshot showing node positioning with jitter
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '06-jitter-spacing.png'),
      fullPage: true,
    });

    // Visual check (manual):
    // - "Task No Deadline" has random offset from base position
    // - Multiple nodes without deadlines don't perfectly stack
    // - Force simulation spreads overlapping nodes
  });

  test('should span timeline across full canvas width', async () => {
    // Get canvas dimensions
    const canvasBox = await page.locator('canvas').first().boundingBox();
    expect(canvasBox).not.toBeNull();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '07-full-width-timeline.png'),
      fullPage: true,
    });

    // Manual verification:
    // - Timeline spans from left to right with PAD=90px margins
    // - Nodes utilize full horizontal space
  });

  test('should switch between layout modes', async () => {
    // Test mode switching
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '08-timeline-mode.png'),
      fullPage: true,
    });

    // Switch to grouped mode (if toolbar button exists)
    const groupedButton = page.locator('button:has-text("Grouped")');
    if (await groupedButton.isVisible()) {
      await groupedButton.click();
      await page.waitForTimeout(500);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '09-grouped-mode.png'),
        fullPage: true,
      });
    }

    // Switch to free mode
    const freeButton = page.locator('button:has-text("Free")');
    if (await freeButton.isVisible()) {
      await freeButton.click();
      await page.waitForTimeout(500);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '10-free-mode.png'),
        fullPage: true,
      });
    }

    // Switch back to timeline
    const timelineButton = page.locator('button:has-text("Timeline")');
    if (await timelineButton.isVisible()) {
      await timelineButton.click();
      await page.waitForTimeout(500);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '11-back-to-timeline.png'),
        fullPage: true,
      });
    }
  });

  test('should display readable labels without overlap', async () => {
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '12-label-readability.png'),
      fullPage: true,
    });

    // Manual verification:
    // - Node labels are readable
    // - Deadline dates are visible
    // - No severe label overlap
    // - Vertical label adjustment working for overlaps
  });
});
