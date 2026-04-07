# TASK-036-MANUS-QUICK-OPEN-NAVIGATION

**Agent:** Manus (R&D)  
**Status:** ⏳ PENDING  
**Priority:** HIGH  

---

## Obiettivo
Migliorare la navigazione nel vault tramite shortcut e interazione diretta con i link.

## Requisiti
1. **Quick Open (`Ctrl+O`)**: Mostrare un modale di ricerca rapida tra i titoli delle pagine. La selezione apre immediatamente la pagina.
2. **Open Vault (`Ctrl+Shift+O`)**: Rimappare l'apertura della cartella vault su questo shortcut (precedentemente `Ctrl+O`).
3. **Interactive Links (`Ctrl+Click`)**: 
   - Se il link esiste: navigare alla pagina.
   - Se il link non esiste: Aprire il Wizard di creazione con il titolo già impostato (chiedere solo il Tipo).
4. **Toggle Graph (`Ctrl+G`)**: Implementare il toggle per la visualizzazione a tutto schermo del pannello grafo.

## Consegna
- Modifiche a `src/App.tsx`, `electron/main.ts` e `src/components/Editor.tsx`.
