# TASK-048-CLAUDE-TIMELINE-LAYOUT-LAYERING

**Agent:** Claude Code  
**Status:** ⏳ PENDING  
**Priority:** HIGH  

---

## Obiettivo
Ottimizzare il posizionamento verticale dei nodi nella Timeline per evitare sovrapposizioni e migliorare la chiarezza strutturale.

## Requisiti
1. **Vertical Categorization**:
   - Assegnare zone rettangolari verticali distinte per le diverse categorie.
   - I "Task" devono avere una loro fascia di altezza.
   - Le "Persona" devono avere una loro fascia di altezza, situata *sotto* quella dei Task.
   - Le due fasce non devono mai sovrapporsi.
2. **Collision Avoidance**:
   - Implementare un algoritmo di posizionamento che eviti sovrapposizioni tra nodi della stessa categoria (specialmente per i Task).
   - Risolvere il bug segnalato di sovrapposizione tra 3 task.
3. **Hierarchy Preservation**: Assicurarsi che la stratificazione Obj > Task > Persona sia mantenuta visivamente.

## Consegna
- Modifiche alla logica di layout in `src/lib/layout.ts`.
- Aggiornamento della visualizzazione in `src/components/Graph.tsx`.
