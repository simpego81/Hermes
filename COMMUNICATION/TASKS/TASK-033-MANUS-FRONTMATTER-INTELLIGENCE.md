# TASK-033-MANUS-FRONTMATTER-INTELLIGENCE

**Agent:** Manus (R&D)  
**Status:** ⏳ PENDING  
**Priority:** HIGH  

---

## Obiettivo
Migliorare l'intelligenza del frontmatter con suggerimenti e validazione condizionale.

## Requisiti
1. **Schema Update**: Aggiornare gli stati dei task in `schema.ts`: `TO-DO`, `WAITING`, `ANALYZING`, `IN PROGRESS`, `READY`, `DONE`.
2. **Logica WAITING**: Implementare una regola: se `status: WAITING`, deve essere presente un campo (es. `blocked_by` o `assignee`) che referenzi una pagina di tipo `persona`.
3. **Autocomplete**: Estendere l'autocompletamento in `Editor.tsx` per suggerire i valori dello schema quando il cursore è dopo `status:` o `priority:` nel frontmatter.

## Consegna
- Modifiche a `src/lib/schema.ts` e `src/components/Editor.tsx`.
