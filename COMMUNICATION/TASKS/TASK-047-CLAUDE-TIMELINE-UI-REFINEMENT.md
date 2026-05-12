# TASK-047-CLAUDE-TIMELINE-UI-REFINEMENT

**Agent:** Claude Code  
**Status:** ⏳ PENDING  
**Priority:** HIGH  

---

## Obiettivo
Migliorare l'estetica e la leggibilità della Timeline, focalizzandosi sugli Objectives e le Label delle Persona.

## Requisiti
1. **Full Width Layout**: La timeline deve estendersi per tutta la larghezza del frame disponibile. Regolare il calcolo del range temporale o la scala D3.
2. **Objective "Flag" UI**:
   - Gli "Objective" non devono più essere semplici cerchi, ma "bandiere" (rettangolo con il nome + marker verticale che punta alla deadline esatta sulla scala temporale).
   - In caso di sovrapposizione tra bandiere, queste devono essere impilate verticalmente (stacking).
3. **Persona Labels**:
   - Posizionare l'etichetta del nome della Persona direttamente sotto il suo cerchio.
   - L'etichetta deve essere orientata verticalmente.
   - Le etichette devono essere sempre visibili.

## Consegna
- Modifiche a `src/components/Graph.tsx` (se la timeline è parte del componente Graph) o componente specifico della Timeline.
- CSS dedicato per i nuovi elementi grafici.
