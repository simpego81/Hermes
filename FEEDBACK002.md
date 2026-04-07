# BUGs

1. Persiste l'errore che fa apparire il popup "please open a vault first to create a new page" ogni volta che l'utente digita CTRL+N per creare una nuova pagina, nonostante sia già stato aperto un vault
2. il grouping per categoria non funziona bene. Devono essere aggregate all'interno della box solamente le pagine della categoria; le altre devono stare fuori dal box

# Improvements
1. Ogni volta che si digita CTRL+N, non si deve mostrare il dialog per salvare il file markdown. Occorre far apparire un popup o un wizard per facilitare la selezione del tipo di pagina (obiettivo, task, persona, ...) e l'inserimento del nome della pagina. Dopo che l'utente conferma, la pagina deve essere creata automaticamente e l'header contenente la descrizione deve essere popolato dei campi necessari del tipo selezionato.
2. la pagine di tipo "person" possono essere referenziate mediante il carattere "@", al posto del formalismo dei link "[[]]"; ogni volta che viene digitato "@" devono apparire tutti i nomi delle pagine di tipo "person".
3. Si deve poter selezionare una categoria anche nella view "timeline". La box dovrà adattarsi per la lunghezza della timeline, al di sotto di essa