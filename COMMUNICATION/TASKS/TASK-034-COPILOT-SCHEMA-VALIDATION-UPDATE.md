# TASK-034-COPILOT-SCHEMA-VALIDATION-UPDATE

**Agent:** Copilot (Validation)  
**Status:** ⏳ PENDING  
**Priority:** MEDIUM  

---

## Obiettivo
Validare i nuovi vincoli dello schema dei metadati.

## Requisiti
1. **Test Stati**: Verificare che i nuovi stati (`ANALYZING`, `WAITING`, ecc.) siano accettati e che quelli vecchi/non previsti generino errori.
2. **Test Condizionale**: Verificare che un task in stato `WAITING` senza una persona associata generi un errore di validazione nell'Inspector.

## Consegna
- Aggiornamento di `tests/schema.test.ts`.
