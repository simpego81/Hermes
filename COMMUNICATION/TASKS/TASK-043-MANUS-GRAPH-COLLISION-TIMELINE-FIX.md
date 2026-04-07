# TASK-043-MANUS-GRAPH-COLLISION-TIMELINE-FIX

**Agent:** Manus (R&D)  
**Status:** ⏳ PENDING  
**Priority:** MEDIUM  

---

## Obiettivo
Risolvere i problemi del grafo e della timeline.

## Requisiti
1. **Graph Collision**: Implementare una forza di collisione (D3 collision force) in `Graph.tsx` per impedire la sovrapposizione dei nodi e mantenere una distanza minima.
2. **Timeline Fix**:
   - Risolvere il problema del grouping "Persona" sempre abilitato e mal posizionato.
   - Disabilitare il grouping per gli "Objectives" nella modalità timeline.
3. **Labels**: Migliorare l'anti-sovrapposizione dei testi deadline (proseguimento dal task precedente se non completato).

## Consegna
- Modifiche a `src/components/Graph.tsx` e `src/lib/layout.ts`.
