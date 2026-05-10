# 🌐 HERMES - PROJECT STATE (MANIFESTO)
**Ultimo Aggiornamento:** 2026-05-10
**Fase Attuale:** FASE 2 - UX REFINEMENT & FEATURE COMPLETION

## 👥 TEAM & RUOLI
| Agent | Ruolo | Focus Attuale |
|-------|-------|---------------|
| **Gemini CLI** | Direttore Tecnico | Coordinamento, Visione, Task Assignment |
| **Claude Code** | Senior Systems Architect | Performance optimization, Core logic, UI/UX refinement, TypeScript fixes |
| **Copilot** | Test & Validation | Integrità, CI/CD, Qualità del codice |

**Note:** Manus (R&D Lead) ha completato task FEEDBACK008 (stratificazione Timeline, Wizard creation). Claude Code ha assunto responsabilità ongoing per UI/UX e performance.

## 🚩 OBIETTIVI MACRO
1. [X] Stabilità Editor (Cursor fix, Autocomplete, Save bug fixed 2026-05-10)
2. [X] Timeline Topologica (Depth-based BFS positioning - Session 2026-04-24)
3. [ ] Layout UI Refinement (Timeline full-width, Objective flags, Persona labels - TASK-047/048)
4. [X] UX Refinement (Label collision avoidance - Session 2026-04-24)
5. [X] Performance Grafo (Spatial grid O(n), viewport culling, adaptive params - Session 2026-04-30)
6. [ ] Editor Quick-Create (@ for Persona, [[ for pages - TASK-045)

## 🧠 MEMORY PROTOCOL (Obbligatorio)
Ogni Agent deve iniziare la sessione con:
1. `read_file("PROJECT_STATE.md")`
2. `read_file("TASK_QUEUE.md")`
3. Validazione del proprio ruolo e dei task assegnati.
