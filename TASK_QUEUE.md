# 📋 HERMES - TASK QUEUE
**Stato:** In Corso

## 🟢 TASK DISPONIBILI (Backlog)
- **[CLAUDE]** TASK-045: Editor - Creazione rapida Persona (@) e Pagine ([[) con popup.
- **[CLAUDE]** TASK-046: Editor - Fix salvataggio file (Task notes).
- **[CLAUDE]** TASK-047: Timeline - Full width e UI Objective (Flags) + Persona Label verticali.
- **[CLAUDE]** TASK-048: Timeline - Layering verticale Task/Persona e anti-collisione nodi.
- **[CLAUDE]** D3 Performance Optimization (In Progress):
  - [ ] Canvas culling (viewport frustum culling) per >500 nodi
  - [ ] Tuning collision force strength (eliminare overlapping FEEDBACK009/010)
  - [ ] FPS monitoring e performance metrics
  - [ ] Test benchmark con 600+ nodi
- **[COPILOT]** Suite di test per validazione algoritmi di Depth e vincoli topologici.

## 🟡 TASK IN CORSO
- **[GEMINI]** Organizzazione FEEDBACK010 e aggiornamento Task Queue.

## 🔴 TASK COMPLETATI
- [X] Setup nuovo protocollo di comunicazione e integrazione Claude Code.
- [X] Aggiornamento Schema (Deadline obbligatoria Objectives).
- [X] Fix Cursore Editor e Autocomplete Wiki-links.
- [X] Implementazione Grafo Fullscreen (CTRL+G).
- [X] Task List con priorità dinamica.
- [X] **[MANUS]** Regolazione Layout Timeline: stratificazione verticale Obj > Task > Others (FEEDBACK008).
- [X] **[MANUS]** Wizard per creazione rapida Persona/Task da link vuoti — pulsante "+ Create" nell'Inspector (FEEDBACK008).
- [X] **[CLAUDE]** Algoritmo di calcolo `Depth` (distanza minima da Objective) per posizionamento Timeline — Session 2026-04-24.
- [X] **[CLAUDE]** Spostamento verticale intelligente anti-collisione per label (node captions + timeline dates) — Session 2026-04-24.
- [X] **[CLAUDE]** Spatial grid collision detection O(n) e adaptive simulation parameters per >500 nodi — Session 2026-04-23/24.
