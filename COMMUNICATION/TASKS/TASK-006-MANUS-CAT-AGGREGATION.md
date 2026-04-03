# TASK-006-MANUS: Aggregazione per Categoria (Box Layout)

## Obiettivo
Implementare la funzionalità di raggruppamento visuale dei nodi in base alla loro categoria.

## Requisiti
1. **Box Layout Logic**: Quando l'aggregazione è attiva, i nodi della stessa categoria devono essere confinati in un'area rettangolare (Box) dedicata.
2. **Ordinamento Interno**: All'interno del box, i nodi devono essere ordinati per "importanza" (numero di link in ingresso) in ordine decrescente, dall'alto a sinistra verso il basso a destra.
3. **UI Toggle**: Implementare un pulsante nella Toolbar per attivare/disattivare questa modalità.
4. **Collision Handling**: Assicurarsi che i box non si sovrappongano e che i nodi rimangano all'interno dei confini del proprio box pur mantenendo i collegamenti visivi verso l'esterno.

## Deliverable
- Algoritmo di layout per aggregazione categorie.
- Pulsante Toolbar "Group by Category".
- REPORT-006-MANUS-CAT-AGGREGATION.md
