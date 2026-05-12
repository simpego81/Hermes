# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Hermes** is an Electron-based desktop knowledge graph application for project delivery teams. It manages "vaults" (directories) containing typed Markdown pages visualized as interconnected nodes in a force-directed graph. Think Obsidian, but specialized for project management with typed entities (Persona, Task, Objective, Component, Note).

**Stack**: Electron + React (TypeScript) + react-force-graph (D3.js) + Vite + Jest

## Development Commands

```bash
# Install dependencies
npm install

# Development mode (Vite dev server + Electron with hot reload)
npm run dev

# Type checking across all TypeScript configs
npm run typecheck

# Linting and formatting
npm run lint
npm run format
npm run format:write

# Run full test suite with coverage
npm test

# Build for production
npm run build        # Runs clean + typecheck + build:renderer + build:electron
npm run clean        # Remove dist/coverage folders
```

### Running Individual Tests
```bash
# Run a specific test file
npm test -- tests/layout.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="Timeline"

# Watch mode
npm test -- --watch
```

## Multi-Agent Development Workflow

Hermes is developed by a coordinated team of AI agents with distinct roles:

- **Gemini CLI** (Direttore Tecnico): Coordinates development, assigns tasks via `TASK_QUEUE.md`, maintains `PROJECT_STATE.md`
- **Claude Code** (Senior Systems Architect): Performance optimization, refactoring, complex logic (layout algorithms, graph engine)
- **Manus** (R&D Lead): New features, UI prototyping, rapid iteration
- **Copilot** (Test & Validation): Test coverage, CI/CD, code quality

### Session Protocol
When starting work, **always**:
1. Read `PROJECT_STATE.md` to understand current phase and macro objectives
2. Read `TASK_QUEUE.md` to see your assigned tasks
3. Check `FEEDBACK*.md` files for recent user feedback and feature requests

### Communication
- Use `CLAUDE_WORK_LOG.md` for session-to-session task tracking (user expectation)
- Tasks are assigned through `TASK_QUEUE.md` with agent names in brackets: `[CLAUDE]`, `[MANUS]`, `[COPILOT]`
- Mark tasks as DONE in `TASK_QUEUE.md` using strikethrough: `~~task description~~ ✅ DONE`

## Architecture

### Page Types and Metadata System

All vault pages are Markdown files with YAML frontmatter defining their type and metadata:

```yaml
---
type: task
status: IN PROGRESS
priority: HIGH
deadline: 2026-05-15
assignees: [[Mario Rossi]]
dependencies: [[TASK-001]]
---
```

**Page Types** (defined in `src/lib/types.ts`):
- `persona`: Team members (properties: tasks_count, objectives_count)
- `task`: Work items (status: TO-DO/WAITING/ANALYZING/IN PROGRESS/READY/DONE, priority, deadline, assignees, dependencies)
- `objective`: Goals (tasks, deadline, stakeholders)
- `component`: Software/hardware components
- `note`: Generic notes

**Schema Validation**: `src/lib/schema.ts` defines required fields and validation rules per page type.

### Core Data Flow

1. **Vault Loading** (`electron/main.ts` IPC handlers):
   - `vault:open-dialog` → User selects directory
   - `vault:read-files` → Recursively reads all `.md` files
   - Returns array of `{path, content}` to renderer

2. **Parsing** (`src/lib/metadata.ts`):
   - `parseMarkdownDocument()` extracts frontmatter metadata + wiki-links `[[Page Title]]`
   - `pageFromSource()` builds `HermesPage` objects

3. **Graph Building** (`src/lib/vault.ts`):
   - `buildGraphData()` converts pages → `{nodes, links}` for D3
   - Node size = `BASE_NODE_SIZE + sqrt(incoming_links) * LINK_SCALE`

4. **Layout Algorithms** (`src/lib/layout.ts`):
   - **Free mode**: Standard force-directed layout
   - **Grouped mode**: 5 category boxes (3×2 grid), nodes positioned by importance within box
   - **Timeline mode**: Horizontal axis = deadline/depth, vertical lanes = page type (Obj > Task > Others)
     - **Depth-based positioning**: Distance from objectives determines X coordinate (FEEDBACK008)
     - Objectives positioned by deadline, other nodes by depth from objectives

### Graph Rendering

- Uses `react-force-graph-2d` wrapper around D3 force simulation
- Custom canvas painting for category boxes, timeline lanes, labels, today marker
- Node colors defined in `PAGE_COLORS` map (src/lib/types.ts)
- DONE tasks get special gray-orange color

### Electron IPC API

Available through `window.electron` (defined in `electron/preload.ts`, typed in `src/types/electron.d.ts`):

```typescript
vault:openDialog()                           // Returns vault directory path
vault:readFiles(vaultPath)                   // Returns [{path, content}]
vault:writeFile(vaultPath, relPath, content) // Saves page to disk
vault:deleteFile(vaultPath, relPath)         // Deletes page
vault:renameFile(vaultPath, oldPath, newPath) // Renames page file
vault:saveDialog(defaultTitle)               // Shows save dialog for new page
```

**Security**: All vault operations validate against path traversal attacks.

## Key Files and Modules

### Core Library (`src/lib/`)
- **types.ts**: Type definitions, page type enums, color constants
- **schema.ts**: Page metadata schemas and validation
- **metadata.ts**: Markdown frontmatter + wiki-link parser
- **vault.ts**: Graph data builder, wiki-link utilities (`findBrokenLinks`, `renamePage`)
- **calculations.ts**: Business logic (backlinks, persona aggregates, task priorities)
- **layout.ts**: Layout algorithms (grouped boxes, timeline positioning with depth calculation)
- **templates.ts**: Markdown generation for new pages

### Components (`src/components/`)
- **App.tsx**: Root component, state management, vault operations orchestration
- **Graph.tsx**: D3 force graph wrapper, canvas rendering, node interaction
- **Editor.tsx**: CodeMirror 6 markdown editor with wiki-link autocomplete
- **Sidebar.tsx**: Page list with search/filtering
- **Toolbar.tsx**: Layout mode switcher, category filter, view controls
- **Inspector.tsx**: Metadata panel, validation errors, broken link creation
- **TaskList.tsx**: Dynamic task prioritization view
- **CommandPalette.tsx**: Quick actions (Cmd+K)
- **CreationWizard.tsx**: New page creation from broken links

### Tests (`tests/`)
All tests use Jest with ts-jest. Coverage thresholds: 90% statements/lines, 80% branches, 100% functions.

- **layout.test.ts**: Group boxes, timeline positioning, depth calculation
- **schema.test.ts**: Metadata validation rules
- **vault.test.ts**: Graph building, wiki-link parsing
- **wiki-integrity.test.ts**: Broken link detection, page renaming
- **performance.test.ts**: Large vault benchmarks (>500 nodes)

## Development Guidelines

### Performance Constraints
- Graph must handle **>500 nodes without lag** (Claude Code responsibility)
- Use D3 force simulation carefully: limit iterations, optimize collision detection
- Avoid re-parsing entire vault on every change; update incrementally when possible

### Layout Algorithm Invariants (FEEDBACK008)
Timeline mode **must maintain**:
1. **Depth-based X positioning**: Nodes farther from objectives appear more to the left
2. **Vertical stratification**: Objectives above axis → Tasks below axis → Persona/Component/Note at bottom
3. **Deadline alignment**: Objectives with deadlines positioned by timeline X coordinate
4. **Today marker**: Vertical line showing current date position

### Wiki-Link Integrity
- When renaming a page, **always** propagate the change to all `[[references]]` using `renamePage()` utility
- Broken links are detected via `findBrokenLinks()` and displayed in Inspector
- Inspector offers "+ Create" button to create missing pages from broken links

### Code Style
- Use TypeScript strict mode
- Prefer immutable patterns (return new arrays/objects, don't mutate state)
- Comment only when the "why" is non-obvious (constraints, invariants, workarounds)
- File headers: Single-line comment describing module purpose

### Testing Requirements
- Every new utility function in `src/lib/` **requires** a test
- Layout changes must update `layout.test.ts` with snapshot or behavior tests
- Schema changes must update `schema.test.ts` validation tests
- Aim for coverage thresholds: 90% statements, 80% branches, 100% functions

## Common Tasks

### Adding a New Page Type
1. Add to `PageType` union in `src/lib/types.ts`
2. Add color to `PAGE_COLORS` map
3. Define schema in `src/lib/schema.ts` → `PAGE_SCHEMAS`
4. Update `BOX_TYPE_ORDER` in `src/lib/layout.ts` for grouped layout
5. Add lane definition in `computeTimelineLanes()` for timeline layout
6. Create template in `src/lib/templates.ts` → `generateMarkdown()`
7. Add test cases in `tests/schema.test.ts`

### Modifying Layout Algorithms
1. Edit `src/lib/layout.ts` (grouped boxes or timeline positioning)
2. Update `tests/layout.test.ts` with new expected behavior
3. If changing timeline: verify depth calculation, lane positions, and deadline alignment
4. Test with large datasets using `tests/performance.test.ts` benchmarks

### Adding an IPC Handler
1. Define handler in `electron/main.ts` using `ipcMain.handle()`
2. Add method signature to `ElectronAPI` interface in `src/types/electron.d.ts`
3. Expose through preload in `electron/preload.ts` → `contextBridge.exposeInMainWorld()`
4. Invoke from renderer via `window.electron.<method>()`

## Build and CI

- **Linter**: ESLint with TypeScript rules (`eslint.config.js`)
- **Formatter**: Prettier (`prettier.config.cjs`)
- **CI**: GitHub Actions (`.github/workflows/ci.yml`, `.github/workflows/lint.yml`)
- **Coverage**: Jest coverage reports uploaded (badge in README)

## Project State Files

- **TASK_QUEUE.md**: Active task assignments and backlog
- **PROJECT_STATE.md**: Current development phase, macro objectives, team roles
- **FEEDBACK*.md**: User feedback and feature requests (numbered sequentially)
- **CLAUDE_WORK_LOG.md**: Session work log (expected by user for continuity)
