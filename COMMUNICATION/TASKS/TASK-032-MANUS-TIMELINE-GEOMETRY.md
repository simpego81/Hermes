# TASK-032-MANUS-TIMELINE-GEOMETRY

**Agent:** Manus (R&D)  
**Status:** ⏳ PENDING  
**Priority:** HIGH  

---

## Obiettivo
Ottimizzare la geometria dei box di raggruppamento nella modalità Timeline.

## Requisiti
1. **Dimensioni**: I rettangoli di categoria nella view `timeline` devono estendersi orizzontalmente per l'intera larghezza della timeline (da margine a margine).
2. **Proporzioni**: Ridurre l'altezza dei box rispetto alla larghezza (stile "corsie" orizzontali).
3. **Posizionamento Nodi**: Allineare i nodi al centro dell'altezza del relativo box di categoria, mantenendo la posizione X corretta sulla timeline.

## Consegna
- Modifiche a `src/components/Graph.tsx` e `src/lib/layout.ts`.
