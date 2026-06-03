# ♊ GEMINI.md — Hermes Project Context

This file serves as the primary instructional context for Gemini CLI when operating within the Hermes repository.

## 🚀 Project Overview

**Hermes** is an Electron-based desktop application designed for project delivery teams. It functions as a specialized knowledge graph (Obsididan-style) that manages "vaults" (local directories) containing typed Markdown pages.

- **Core Concept**: Every Markdown file in the vault represents a node in a graph. Relationships are defined via `[[wiki-links]]` and YAML frontmatter metadata.
- **Key Entities**: Persona, Task, Objective, Component, Note.
- **Visualizations**: Interactive force-directed graph with multiple layout modes (Free, Grouped, Timeline).

### 🛠️ Technology Stack
- **Runtime**: Electron
- **Frontend**: React (TypeScript) + Vite
- **Graph Engine**: D3.js / `react-force-graph-2d`
- **Editor**: CodeMirror 6
- **Testing**: Jest (Unit/Integration) + Playwright (E2E/Visual)
- **Styling**: Vanilla CSS with Custom Properties

---

## 👥 Multi-Agent Development Workflow

Hermes is developed by a team of specialized AI agents. **Gemini CLI (you)** acts as the **Direttore Tecnico**.

### Roles & Responsibilities
| Agent | Role | Focus |
| :--- | :--- | :--- |
| **Gemini CLI** | Direttore Tecnico | Coordination, Vision, Task Assignment, `PROJECT_STATE.md` maintenance. |
| **Claude Code** | Senior Architect | Performance, Core Logic (Layout algorithms), Refactoring, TS fixes. |
| **Manus** | R&D Lead | New features, UI/UX prototyping, Rapid iteration. |
| **Copilot** | Test & Validation | Test coverage, CI/CD, Code quality, Repository maintenance. |

### 🔄 Mandatory Session Protocol
At the beginning of every session, you MUST:
1.  Read `PROJECT_STATE.md` to understand the current phase and macro goals.
2.  Read `TASK_QUEUE.md` to identify your active tasks and coordinate other agents.
3.  Check `COMMUNICATION/REPORTS/` and `COMMUNICATION/TASKS/` for recent activity.

---

## 💻 Development Guide

### ⌨️ Key Commands
```bash
# Setup
npm install

# Local Development
npm run dev          # Starts Vite dev server + Electron

# Verification
npm run typecheck    # Run TS compiler checks
npm run lint         # ESLint checks
npm run format       # Prettier check
npm run test         # Jest tests with coverage
npm run test:e2e     # Playwright E2E tests (Critical for UI/Layout changes)

# Production
npm run build        # Full build (Renderer + Main)
```

### 📁 Project Structure
- `electron/`: Main process logic, IPC handlers, and preload script.
- `src/components/`: React UI components (Graph, Editor, Sidebar, etc.).
- `src/lib/`: Core business logic (Layouts, Metadata parsing, Schema validation).
- `tests/`: Comprehensive test suite, including `fixtures/test-vault/`.
- `COMMUNICATION/`: Inter-agent communication (Tasks and Reports).

---

## 🧠 Architectural Principles

### 1. Metadata & Schema
All pages must have a `type` in their YAML frontmatter. Validation logic resides in `src/lib/schema.ts`.
- **Invariant**: `task` pages with `WAITING` status require either `blocked_by` or an assignee.
- **Invariant**: `objective` pages require a `deadline`.

### 2. Graph Layout Algorithms (`src/lib/layout.ts`)
- **Grouped Mode**: Nodes are clustered into 3×2 grid boxes based on category importance.
- **Timeline Mode**: 
    - **X-Axis**: Represents time (deadlines) or "Depth" (minimum distance from an objective).
    - **Vertical Lanes**: Stratified by type (Objective > Component > Task > Persona > Note).
    - **Collision Avoidance**: Spatial grid O(n) detection for label positioning.

### 3. Wiki-Link Integrity
- Renaming a page via the UI must propagate to all references in the vault using `renamePage()` in `src/lib/vault.ts`.
- Broken links are tracked and displayed in the **Inspector** for quick resolution via the **CreationWizard**.

### 4. Quality & Testing
- **Coverage Thresholds**: 90% Statements/Lines, 80% Branches, 100% Functions.
- **Visual Verification**: Any change to the Graph or Timeline **requires** running Playwright E2E tests and reviewing screenshots in `test-results/`.

---

## 📝 Contribution Guidelines
- **Immutability**: Always prefer immutable state updates in React and library logic.
- **Documentation**: Use `CLAUDE_WORK_LOG.md` (or your session equivalent) to track progress.
- **IPC Safety**: Validate all file paths in the main process to prevent traversal attacks.
- **Styling**: Adhere to the Vanilla CSS pattern; avoid adding CSS-in-JS or Tailwind unless explicitly directed.

---

**Direttore Tecnico**, maintain the project vision and ensure all agents adhere to these protocols. Current status can always be found in `PROJECT_STATE.md`.
