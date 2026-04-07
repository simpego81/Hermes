# TASK-026-COPILOT-WIZARD-INTEGRITY-TEST

**Agent:** Copilot (Validation)  
**Status:** ⏳ PENDING  
**Priority:** MEDIUM  

---

## Obiettivo
Validare il corretto funzionamento del nuovo Page Wizard.

## Requisiti
1. **Frontmatter Test**: Verificare che la creazione di un "Task" tramite Wizard generi un file con i campi `status` e `priority` correttamente inizializzati.
2. **File System**: Verificare che il file venga effettivamente creato nella directory del vault senza dialoghi di sistema bloccanti.

## Consegna
- Nuovo file di test `tests/wizard.test.ts`.
