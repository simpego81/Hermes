# TASK-028-MANUS-LIFECYCLE-MANAGEMENT

**Agent:** Manus (R&D)  
**Status:** ⏳ PENDING  
**Priority:** HIGH  

---

## Obiettivo
Implementare la gestione completa del ciclo di vita dei file (rinomina ed eliminazione).

## Requisiti
1. **Eliminazione**: 
   - Aggiungere un pulsante "Delete" nell'Inspector e un'opzione nel menu contestuale della Sidebar.
   - Richiedere conferma prima dell'eliminazione.
   - Rimuovere il file dal disco (via IPC) e aggiornare lo stato `pages` e il grafo.
2. **Rinomina**:
   - Abilitare la rinomina del file (ID) direttamente dall'Inspector.
   - Utilizzare `renamePage` di `vault.ts` per propagare il nuovo titolo in tutti i link esistenti nel vault.
3. **IPC**: Implementare in `main.ts` e `preload.ts` i metodi `vault:delete-file` e `vault:rename-file`.

## Consegna
- Modifiche a `electron/main.ts`, `electron/preload.ts`, `src/App.tsx`, `src/components/Inspector.tsx`.
