# TASK-016-COPILOT-AGGREGATE-VALIDATION

**Agent:** Copilot (Validation)  
**Status:** ⏳ PENDING  
**Priority:** MEDIUM  

---

## Obiettivo
Garantire la correttezza dei dati aggregati e dei backlinks.

## Requisiti
1. **Test Backlinks**: Verificare che se Pagina A linka Pagina B, Pagina B mostri correttamente Pagina A tra i backlinks.
2. **Test Conteggi Persona**: Creare scenari con più task assegnati a una persona e verificare che il contatore nell'Inspector sia accurato.
3. **Test Regressivi**: Assicurarsi che il rinominamento di una pagina aggiorni correttamente sia i link in uscita che i backlinks/aggregati.

## Consegna
- Nuovo file di test `tests/aggregates.test.ts`.
