# TASK-011-COPILOT: Test di Integrità e Sincronizzazione

## Obiettivo
Validare che l'editing simultaneo di più file e la sincronizzazione con il grafo siano robusti.

## Requisiti
1. **End-to-End Flow Test**: Creare un test che simuli: Creazione pagina -> Scrittura contenuto -> Aggiunta di un `[[Wiki-link]]` -> Verifica che il nuovo link appaia nel grafo senza ricaricare l'app.
2. **Persistence Test**: Verificare che in caso di chiusura improvvisa dell'app, i dati non salvati nell'editor vengano gestiti correttamente (o salvati negli ultimi istanti).
3. **Wiki-link Integrity**: Verificare che rinominando un file, tutti i link `[[ ]]` all'interno delle altre pagine vengano aggiornati automaticamente (o segnalati come "broken links").

## Deliverable
- Suite di test E2E (Cypress o Playwright).
- Report di validazione sincronizzazione.
- REPORT-011-COPILOT-SYNC-TESTS.md
