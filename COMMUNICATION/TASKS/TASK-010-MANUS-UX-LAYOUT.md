# TASK-010-MANUS: Layout Management & Navigazione

## Obiettivo
Creare l'architettura della UI che permetta di alternare o affiancare l'Editor e il Grafo.

## Requisiti
1. **Split View Layout**: Implementare un sistema di pannelli flessibili:
   - Sidebar sinistra: File Explorer (lista pagine).
   - Area Centrale: Editor Markdown.
   - Area Destra o Pannello flottante: Grafo.
2. **Graph-to-Editor Navigation**: Cliccando su un nodo nel grafo, l'editor deve caricare istantaneamente il file corrispondente.
3. **Breadcrumbs & History**: Implementare una barra di navigazione che mostri il percorso del file corrente e permetta di tornare indietro tra le pagine visitate.
4. **UI Polishing**: Assicurarsi che il passaggio tra modalità Edit e modalità Graph sia fluido (UX "snappy").

## Deliverable
- Layout a pannelli interattivi.
- Sistema di navigazione bi-direzionale (Grafo <-> Editor).
- REPORT-010-MANUS-UX-LAYOUT.md
