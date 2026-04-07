# TASK-012-MANUS-AGGREGATES-BACKLINKS

**Agent:** Manus (R&D)  
**Status:** ⏳ PENDING  
**Priority:** HIGH  

---

## Obiettivo
Implementare la logica di calcolo e la visualizzazione dei Backlinks e dei dati aggregati nell'Inspector.

## Requisiti
1. **Backlinks**: Mostrare nell'Inspector l'elenco delle pagine che contengono un `[[wiki-link]]` verso la pagina corrente.
2. **Aggregati Persona**: Nelle pagine di tipo `persona`, calcolare e visualizzare:
   - Numero di Task associati (tramite metadati `assignees`).
   - Numero di Objective correlati.
3. **Aggregati Objective**: Nelle pagine di tipo `objective`, mostrare l'avanzamento dei Task correlati (es. "2/5 completati").

## Consegna
- Aggiornamento di `src/components/Inspector.tsx`.
- Eventuali utility in `src/lib/vault.ts` per il calcolo delle relazioni inverse.
