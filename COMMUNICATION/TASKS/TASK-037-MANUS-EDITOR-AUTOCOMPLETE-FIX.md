# TASK-037-MANUS-EDITOR-AUTOCOMPLETE-FIX

**Agent:** Manus (R&D)  
**Status:** ⏳ PENDING  
**Priority:** MEDIUM  

---

## Obiettivo
Risolvere il bug dell'autocompletamento dei link nell'editor.

## Requisiti
1. **Fix Output**: Assicurarsi che selezionando un suggerimento dal menu `[[`, il risultato finale contenga solo una coppia di parentesi quadre chiuse `]]`. 
2. **Logica**: Evitare che la substring `]]` venga aggiunta se già presente o gestire correttamente il range di sostituzione in CodeMirror.

## Consegna
- Modifiche a `src/components/Editor.tsx`.
