# TASK-005-COPILOT: Test di Integrazione e Validazione Schema

## Obiettivo
Assicurare la qualità dei dati e la robustezza del sistema di linking.

## Requisiti
1. **Integration Tests**: Creare una suite di test che verifichi il corretto parsing di un "Vault di Test" contenente pagine di ogni categoria.
2. **Metadata Validation Tests**: Verificare che file con metadati errati o mancanti vengano segnalati correttamente (o gestiti con fallback).
3. **Graph Data Consistency**: Testare che il calcolo dei link in ingresso (per lo scaling dei nodi) sia accurato.
4. **CI Update**: Integrare questi nuovi test nella pipeline GitHub Actions.

## Deliverable
- Suite di test aggiornata.
- Report di coverage.
- REPORT-005-COPILOT-VALIDATION.md
