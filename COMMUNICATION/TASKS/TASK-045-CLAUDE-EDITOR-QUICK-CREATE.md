# TASK-045-CLAUDE-EDITOR-QUICK-CREATE

**Agent:** Claude Code  
**Status:** ⏳ PENDING  
**Priority:** HIGH  

---

## Obiettivo
Implementare la creazione rapida di nodi direttamente dall'Editor tramite trigger di caratteri speciali (@ e [[).

## Requisiti
1. **Persona Shortcut (@)**:
   - Rilevare quando l'utente digita `@` seguito da un'etichetta.
   - Se l'etichetta non esiste nel vault, mostrare un popup/modale (o integrazione con `CreationWizard`) che chieda se creare una nuova "Persona".
   - In caso di conferma, creare il file markdown corrispondente con il template Persona.
2. **Page Shortcut ([[)**:
   - Rilevare quando l'utente digita `[[` seguito da un'etichetta.
   - Il trigger del popup deve avvenire quando l'utente preme uno spazio o un carattere di punteggiatura dopo l'etichetta (se non esiste nel vault).
   - Mostrare un popup che chieda se creare una nuova pagina e di quale tipo (Objective, Task, Note, Persona).
   - In caso di conferma e selezione tipo, creare il file markdown corrispondente.
3. **UI/UX**:
   - Assicurarsi che il popup non interferisca con il flusso di scrittura naturale.
   - Utilizzare possibilmente componenti esistenti (`CreationWizard`) o estenderli.

## Consegna
- Modifiche a `src/components/Editor.tsx` e logica associata in `src/lib/vault.ts`.
- Aggiornamento dei componenti UI necessari.
