# TASK-017-COPILOT-AUTOCOMPLETE-PERF

**Agent:** Copilot (Validation)  
**Status:** ⏳ PENDING  
**Priority:** LOW  

---

## Obiettivo
Validare le performance del sistema di autocompletamento e suggerimento con Tab.

## Requisiti
1. **Stress Test**: Generare un vault di prova con 2000 pagine e testare il tempo di risposta del suggeritore `[[`.
2. **Tab Acceptance**: Verificare tramite test unitari che il tasto `Tab` accetti correttamente il suggerimento in CodeMirror senza inserire tabulazioni extra nel documento.

## Consegna
- Aggiornamento di `tests/performance.test.ts`.
