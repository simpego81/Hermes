# TASK-046-CLAUDE-EDITOR-SAVE-BUGFIX

**Agent:** Claude Code  
**Status:** ⏳ PENDING  
**Priority:** CRITICAL  

---

## Obiettivo
Risolvere il bug per cui il salvataggio dei file nell'Editor non funziona più, specialmente per le note di tipo "Task".

## Requisiti
1. **Root Cause Analysis**: Identificare perché la persistenza su disco è interrotta. Controllare le chiamate IPC verso Electron e la logica in `src/lib/vault.ts`.
2. **Fix Implementation**: Ripristinare il salvataggio automatico o manuale assicurandosi che i metadati (frontmatter) non vengano corrotti.
3. **Verification**: Assicurarsi che le modifiche effettuate nell'Editor siano persistite correttamente nel file system e che il Grafo le rifletta dopo il salvataggio.

## Consegna
- Fix in `src/components/Editor.tsx`, `src/lib/vault.ts` o `electron/main.ts`.
