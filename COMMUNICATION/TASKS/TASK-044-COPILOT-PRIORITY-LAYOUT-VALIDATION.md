# TASK-044-COPILOT-PRIORITY-LAYOUT-VALIDATION

**Agent:** Copilot (Validation)  
**Status:** ⏳ PENDING  
**Priority:** HIGH  

---

## Obiettivo
Validare l'algoritmo di calcolo delle priorità e il nuovo layout a tre pannelli.

## Requisiti
1. **Priority Logic Test**: 
   - Verificare il calcolo `MAX(link) + 1` in scenari con link a catena (A->B->C).
   - Testare la gestione dei cicli (A->B->A) per evitare crash.
   - Verificare che i task senza link abbiano priorità 0.
2. **Layout Integrity**: Verificare che il Graph (Top), l'Editor (Bottom) e la Task List (Right) siano visibili e correttamente dimensionati (non si sovrappongano).
3. **Editor Stability**: Confermare che l'inserimento di spazi a fine riga non causi la cancellazione automatica o lo spostamento del cursore.

## Consegna
- Nuovo file di test `tests/priority-layout.test.ts`.
