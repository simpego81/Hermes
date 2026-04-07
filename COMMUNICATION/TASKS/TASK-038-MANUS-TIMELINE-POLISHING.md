# TASK-038-MANUS-TIMELINE-POLISHING

**Agent:** Manus (R&D)  
**Status:** ⏳ PENDING  
**Priority:** HIGH  

---

## Obiettivo
Risolvere bug visuali e migliorare la leggibilità della Timeline.

## Requisiti
1. **Label Collision**: Implementare un meccanismo di offset verticale per le label dei nodi nella timeline quando i testi si sovrappongono.
2. **Fix Persona Grouping**: Ripristinare la visualizzazione dei box di raggruppamento per le persone nella modalità timeline (attualmente non funzionanti).
3. **Defaults**: Assicurarsi che i nuovi task creati abbiano la `deadline` vuota per impostazione predefinita.

## Consegna
- Modifiche a `src/lib/layout.ts` e `src/components/Graph.tsx`.
