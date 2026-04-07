# TASK-030-MANUS-TIMELINE-LAYERING

**Agent:** Manus (R&D)  
**Status:** ⏳ PENDING  
**Priority:** MEDIUM  

---

## Obiettivo
Migliorare la leggibilità del layout Timeline separando i tipi di pagina verticalmente.

## Requisiti
1. **Layering**: Nella modalità `timeline`, posizionare gli `objective` su un asse Y più alto (più vicini alla linea temporale) e i `task` su un asse Y inferiore.
2. **Visualizzazione**: Mantenere l'ordinamento orizzontale per data.
3. **Logica**: Modificare il calcolo delle coordinate in `layout.ts`.

## Consegna
- Modifiche a `src/lib/layout.ts`.
