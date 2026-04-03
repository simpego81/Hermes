# TASK-009-MANUS: Editor Markdown & Wiki-links Support

## Obiettivo
Implementare l'interfaccia di editing testuale con le funzionalità tipiche di Obsidian.

## Requisiti
1. **Markdown Editor**: Integrare CodeMirror 6 come componente editor. Deve supportare:
   - Syntax highlighting per Markdown e YAML Frontmatter.
   - Auto-indentazione e shortcut standard.
2. **Wiki-links Autocomplete**: Implementare il supporto per i collegamenti `[[ ]]`. All'apertura delle parentesi quadre, deve apparire un dropdown con la lista delle pagine esistenti nel vault.
3. **Metadata Sync**: L'editor deve permettere di modificare il Frontmatter YAML. Ogni modifica deve scatenare un evento di aggiornamento per il motore del grafo.
4. **Auto-save**: Implementare il salvataggio automatico sul file system locale con debounce (es. 500ms dall'ultima modifica).

## Deliverable
- Componente Editor integrato.
- Sistema di autocompletamento link.
- REPORT-009-MANUS-EDITOR-CORE.md
