# TASK-003-MANUS: Implementazione Categorie Pagine e Logica Metadati

## Obiettivo
Sviluppare il sistema di gestione delle tipologie di pagine (Persona, Task, Objective, Component, Note) con le proprietà richieste.

## Requisiti
1. **Schema Validation**: Implementare un sistema che validi il Frontmatter YAML in base al `type`.
   - **Persona**: Richiede `tasks_count`, `objectives_count` (calcolati dinamicamente dai link).
   - **Task**: Richiede `status` (enum), `deadline`, `priority`, `assignees`, `dependencies`.
   - **Objective**: Richiede `tasks`, `dependencies`, `deadline`, `stakeholders`.
2. **Page Templates**: Creare template markdown predefiniti per ogni categoria attivabili alla creazione di una nuova pagina.
3. **Property Editor UI**: Creare un pannello laterale (Inspector) per visualizzare e modificare i metadati della pagina corrente in modo visuale (senza editare direttamente il YAML).

## Deliverable
- Modulo di validazione schema.
- UI Inspector per metadati.
- REPORT-003-MANUS-PAGE-LOGIC.md
