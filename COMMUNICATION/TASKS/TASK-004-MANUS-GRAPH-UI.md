# TASK-004-MANUS: Engine Grafo Avanzato (Colori e Scaling)

## Obiettivo
Evolvere il rendering del grafo per riflettere la semantica dei dati di Hermes.

## Requisiti
1. **Colorazione Semantica**: Ogni nodo deve avere un colore distintivo basato sul `type`:
   - Persona: Blu
   - Task: Arancione
   - Objective: Verde
   - Component: Viola
   - Note: Grigio
2. **Dynamic Scaling**: La dimensione del raggio del nodo deve essere proporzionale al numero di link in ingresso (`in-degree`). Formula proposta: `radius = 5 + sqrt(links_in) * 2`.
3. **Hover & Interaction**: Visualizzazione dei metadati principali al passaggio del mouse sul nodo.

## Deliverable
- Engine grafo aggiornato con logic di stile.
- REPORT-004-MANUS-GRAPH-UI.md
