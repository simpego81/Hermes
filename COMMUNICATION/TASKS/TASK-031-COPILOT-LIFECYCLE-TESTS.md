# TASK-031-COPILOT-LIFECYCLE-TESTS

**Agent:** Copilot (Validation)  
**Status:** ⏳ PENDING  
**Priority:** HIGH  

---

## Obiettivo
Validare la robustezza delle operazioni di eliminazione e rinomina file.

## Requisiti
1. **Data Integrity**: Testare che l'eliminazione di una pagina rimuova correttamente tutti i suoi nodi dal grafo e che i link in entrata verso di essa diventino "broken".
2. **FileSystem Sync**: Verificare che l'eliminazione tramite UI rimuova effettivamente il file dal disco nel vault selezionato.
3. **Rename Propagation**: Test intensivo di rinomina su vault con link circolari.

## Consegna
- Aggiornamento di `tests/persistence.test.ts` e `tests/wiki-integrity.test.ts`.
