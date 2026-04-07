# TASK-025-MANUS-GRAPH-LAYOUT-REFINEMENT

**Agent:** Manus (R&D)  
**Status:** ⏳ PENDING  
**Priority:** HIGH  

---

## Obiettivo
Perfezionare i raggruppamenti nel grafo (Category Grouping e Timeline).

## Requisiti
1. **Exclusive Grouping**: Nel layout `grouped`, solo i nodi della categoria selezionata devono stare dentro il box. Gli altri devono essere distribuiti all'esterno (layout libero).
2. **Timeline Categories**: Nella view `timeline`, implementare box di categoria orizzontali posizionati sotto la linea temporale per raggruppare visivamente i nodi (es. Task sopra, Note sotto).
3. **UX**: La box deve adattarsi dinamicamente alla lunghezza della timeline.

## Consegna
- Modifiche a `src/lib/layout.ts` e `src/components/Graph.tsx`.
