# TASK-024-MANUS-MENTION-PERSONA

**Agent:** Manus (R&D)  
**Status:** ⏳ PENDING  
**Priority:** MEDIUM  

---

## Obiettivo
Implementare le menzioni rapide per le persone tramite il carattere `@`.

## Requisiti
1. **Editor Integration**: In `Editor.tsx`, aggiungere un trigger di autocompletamento per il carattere `@`.
2. **Filtro**: Il menu a tendina deve mostrare solo le pagine il cui `type` è `persona`.
3. **Output**: L'inserimento deve risultare in un link standard `[[Nome Persona]]` (per mantenere la compatibilità con il parser).

## Consegna
- Modifiche a `src/components/Editor.tsx`.
