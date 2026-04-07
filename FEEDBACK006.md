# bugs
1. in timeline, il grouping persona rimane sempre abilitato, in una posizione strana e non allineata alla timeline.
2. CTRL+G non apre il fullscreen del grafo. Abilita erroneamente il fullscreen del contenuto della pagina selezionata
3. durante l'editing della pagina, il cursore si sposta. A volte cancella il carattere ' ' se a fine linea

# improvements
1. nella timeline, eliminare la possibilità di fare grouping sugli obiettivi
2. All'apertura di una pagina, il cursore di editing deve essere posizionato alla fine del file
3. CTRL+W deve chiudere la pagina corrente, non tutto il software
4. Nel graph, i nodi non devono sovrapporsi né avvicinarsi troppo.
5. I task con status = DONE devono essere colorati di arancio-grigio

## Layout
### Graph
Devi cambiare il layout attuale. Il graph deve stare nella parte superiore del layout, non nella parte destra. 

### Task list
Nella parte destra ci deve essere una lista non editabile di tutti i task.
I task devono essere ordinati.

#### TO-DO Task list
La parte superiore della lista dei task deve contenere i task con status = "TO-DO".
La lista deve essere ordinata per priorità crescente.
La priorità viene calcolata basandosi sulla priorità più alta dei task linkati da esso, incrementata di uno. Il task che non contiene link ha una priorità pari a 0.

#### WAITING task list
La parte inferiore della lista dei task deve contenere i task con status = "WAITING".
L'ordinamento è secondo l'algoritmo di priorità descritto al punto precedente.