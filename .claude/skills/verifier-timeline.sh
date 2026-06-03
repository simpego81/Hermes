#!/bin/bash
# Verifier skill for Hermes timeline and graph UI changes
#
# This skill runs E2E tests with Playwright to verify UI changes
# by capturing screenshots and interaction behavior.
#
# Usage: Invoked automatically by /verify skill when UI changes detected

set -e

echo "🎭 Hermes Timeline UI Verifier"
echo "=============================="
echo ""

# Build the app first
echo "📦 Building Electron app..."
npm run build:renderer
npm run build:electron

echo ""
echo "🧪 Running E2E tests..."
npm run test:e2e

echo ""
echo "📸 Screenshots saved to: test-results/screenshots/"
echo ""
echo "✅ E2E tests completed"
echo ""
echo "📊 View full report:"
echo "   npm run test:e2e:report"
echo ""
echo "⚠️  MANUAL VERIFICATION REQUIRED:"
echo "   Review screenshots in test-results/screenshots/"
echo "   Verify:"
echo "   - Lane stratification (Obj > Component > Task > Persona > Note)"
echo "   - Deadline positioning on timeline"
echo "   - Label readability without overlap"
echo "   - Draggable vs pinned nodes"
echo "   - Jitter spacing for non-deadline nodes"
