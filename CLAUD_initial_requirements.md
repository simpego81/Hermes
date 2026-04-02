# Introduzione

Qui le direttive per creare un tool software (chiamato "Hermes") da rilasciare che verrà usato da project managers, product owners e software architects.
Agisci come amministratore delegato della software house che sviluppa il tool mediante una organizzazione aziendale composta da altri agent AI.

Crea le regole e il setup di collaborazione tra gli agent, con ruoli ben definiti per gli agent.
Considera che io verificherò e darò feedback sullo sviluppo e sul prodotto, quindi devi organizzare anche questo processo.
Devi specificare il modus operandi agli agent, creando i working agreement che dovranno essere sempre applicati ogni volta che gli agent lavoranno ai task a loro assegnati.
Progetta la comunicazione tra i vari agent usando un approccio basato su file di testo.
Il processo e il prodotto dovranno essere monitorati da me.

Gli altri ruoli aziendali che devi normare sono:
1. direttore del dipartimento tecnico (impersonato dall'agent Gemini CLI):
  - deve dare le specifiche tecniche precise agli altri agent
  - deve creare i task per gli agent di volta in volta
  - deve coordinare l'avanzamento del progetto comandando gli altri agent
  - deve recepire feedback da me sul prodotto e sul progetto (ad esempio: segnalazioni di bug, improvements o richieste di organizzare debug particolari)
  
2. il responsabile del reparto Ricerca & Sviluppo (impersonato dall'agent Manus), che risponde direttamente al direttore.
3. il responsabile del reparto di Test & Validazione (impersonato dall'agent Copilot di Microsoft Visual Studio Code) che risponde direttamente al direttore.

Devi dare istruzioni a Copilot per impostare il progetto su GitHub, con tanto di pipeline, test automatici e badge.

L'interfaccia aziendale con cui mi rapporterò è il direttore.
L'interfaccia aziendale a cui scriverai le istruzioni e le specifiche di tutto è il direttore. A lui viene delegato il tutto.
Il prodotto a cui delego a te l'organizzazione dello sviluppo e lo sviluppo stesso si chiama "Hermes".

# Requisiti di prodotto

Hermes è un clone di Obsidian ma è piuttosto customizzato.
In ogni "vault" ci sono un insieme di "pagine" correlate fra loro. La correlazione fra le pagine si potrà vedere in un grafo.
Quindi la UI e la User Experience devono essere uguali a Obsidian.

## Pagine

Le pagine sono i nodi del grafo.
Il contenuto delle pagine è codificato come documenti mark-down.
Le pagine sono di diverse categorie.

### Categorie di pagine
#### Pagine di tipo "Persona"
Questo tipo di pagina identifica una persona di una organizzazione.
Le proprietà associate alla Persona sono:
- il numero di "Task" ad essa associate.
- il numero di "obiettivi" ad essa associati.

#### Pagine di tipo "Task" 
Questo tipo di pagina rappresenta un compito da svolgere.
Le proprietà associate al Task sono:
- lo stato di avanzamento: "TO BE DEFINED", "TO-DO", "DOING", "READY", "DONE"
- l'eventuale deadline
- le eventuali dipendenze legate ad altri Task
- la priorità o urgenza
- le eventuali Persone che sono assegnate al task

#### Pagine di tipo "Obiettivi" 
Questo tipo di pagina rappresenta gli obiettivi di un progetto.
Gli obiettivi hanno:
- relazioni con i Task che servono per completare l'obiettivo
- eventuali dipendenze da altri obiettivi
- l'eventuale deadline
- le eventuali persone interessate all'obiettivo

#### Pagine di tipo "Componenti" 
pagine che rappresentano "componenti" - intesi come componenti software, hardware, prodotti, tools


#### Pagine di tipo "Note" 
Sono pagine generiche, come qualsiasi pagina di Obsidian.

### Stile del grafo
Il grafo deve essere nello stesso stile di Obsidian, stessa User Experience.
Ogni categoria di pagine deve avere il suo colore.
La dimensione del nodo aumenta con l'aumentare dei link in ingresso alla pagina.

#### Aggregazioni per categoria
Ci deve essere una toolbar che abilita o disabilita l'aggregazione dei nodi della stessa categoria: l'aggregazione deve avvenire in una box, al di sopra di tutti gli altri nodi, ordinando i nodi in ordine decresente dall'alto a sinistra verso il basso a destra.

#### Aggregazioni sulla timeline
Ci deve essere una toolbar che abilita o disabilita l'aggregazione dei nodi che hanno deadline: l'aggregazione deve avvenire in una box, al di sopra di tutti gli altri nodi, ordinando i nodi in ordine temporale dalla sinistra verso la destra.

Scrivi le istruzioni da dare al direttore (Gemini CLI) in un markdown per far partire lo sviluppo.