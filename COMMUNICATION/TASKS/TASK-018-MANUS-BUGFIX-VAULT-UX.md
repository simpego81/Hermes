# TASK-018-MANUS-BUGFIX-VAULT-UX

**Agent:** Manus (R&D)  
**Status:** ⏳ PENDING  
**Priority:** HIGH  

---

## Obiettivo
Risolvere i problemi di gestione vault e interazione segnalati in FEEDBACK001.md.

## Requisiti
1. **Popup Ctrl+Click**: Impedire l'apparizione del messaggio "please open a vault first" se un vault è già caricato.
2. **Demo Cleanup**: Assicurarsi che `DEMO_PAGES` vengano rimosse completamente dallo stato `pages` quando un vault reale viene aperto.
3. **Rename Support**: Implementare nell'Inspector la possibilità di modificare il titolo della pagina (utilizzando `renamePage` di `vault.ts` per la propagazione).

## Consegna
- Modifiche in `src/App.tsx` e `src/components/Inspector.tsx`.
