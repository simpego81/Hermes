# TASK-014-MANUS-UX-REFINEMENT

**Agent:** Manus (R&D)  
**Status:** ⏳ PENDING  
**Priority:** MEDIUM  

---

## Obiettivo
Migliorare l'esperienza di editing e la gestione dell'integrità dei link.

## Requisiti
1. **Shortcut Editor**: Implementare `Ctrl+Enter` per ciclicare lo stato dei Task nella riga corrente o nel frontmatter (es: TO-DO -> DOING -> DONE).
2. **Broken Links UI**: Visualizzare un avviso visivo nell'Inspector o direttamente nell'editor quando viene rilevato un link rotto (`findBrokenLinks`).
3. **Navigazione**: Implementare `Alt+Left` e `Alt+Right` per navigare avanti/indietro nella cronologia delle pagine (navHistory).

## Consegna
- Modifiche a `src/components/Editor.tsx` e `src/App.tsx`.
