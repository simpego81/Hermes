# TASK-015-COPILOT-UI-SHORTCUT-TESTS

**Agent:** Copilot (Validation)  
**Status:** ⏳ PENDING  
**Priority:** HIGH  

---

## Obiettivo
Validare l'integrazione tra i menu nativi di Electron e la logica React dell'applicazione.

## Requisiti
1. **Test Integrazione**: Verificare che i messaggi inviati dal Main Process (`menu:new-page`, `menu:open-vault`, ecc.) vengano ricevuti correttamente in `App.tsx`.
2. **Test Shortcuts**: Simulare la pressione di `Ctrl+N` e `Ctrl+S` e verificare che scatenino rispettivamente la creazione della pagina e il salvataggio (o il feedback visivo).
3. **Mocking**: Fornire mock adeguati per le API `window.hermesDesktop`.

## Consegna
- Nuovo file di test `tests/shortcuts.test.ts`.
