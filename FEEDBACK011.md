# improvements

## editing ✅ IMPLEMENTED (Session 2026-05-12)
- ✅ se l'utente digita un link non esistente all'interno di "[[" e "]]", deve apparire il popup di creazione pagina con il titolo già compilato (secondo quanto scritto nell'input utente). → **TASK-049** (already implemented in TASK-045)
- ✅ il contenuto di una pagina appena creata deve essere vuoto e il cursore posizionarsi dopo il titolo. Eliminare il testo precompilato nel corpo della pagina → **TASK-050**

## timeline ✅ IMPLEMENTED (Session 2026-05-12)
- ✅ cambiare l'implementazione del grouping delle categorie. Le categorie non possono più essere raggruppate, prevedere una swimlane per ciascuna categoria in cui sono confinati i nodi della stessa categoria. → **TASK-051**
  - l'ordine visuale delle categorie, dall'alto verso il basso: objectives, components, tasks, persona, notes
- ✅ la timeline in partenza deve essere adattata a tutta la larghezza disponibile del frame. → **TASK-052** (verified existing implementation)
- ✅ la timeline deve essere sempre aperta di default → **TASK-053**

## generic ✅ IMPLEMENTED (Session 2026-05-12)
- ✅ l'applicazione deve ricordarsi l'ultimo workspace (directory o vault) aperta e partire con quella → **TASK-054**

## task list ✅ IMPLEMENTED (Session 2026-05-12)
- ✅ la lista dei task deve essere ordinata per priorità decrescente. → **TASK-055**
- ✅ la priorità di un task ha 3 livelli: 
  - primo livello: esplicito, dato dal campo "priority"; 
  - secondo livello: è dato dal numero di incoming links: se è 0, la priorità è la più alta. La priorità decresce col aumentare degli incoming links
  - terzo livello: è dato dal numero di outgoing links verso altri task, o component o objectives. se è 0, la priorità è la più bassa. La priorità cresce col aumentare degli outgoing links verso task, components e objectives

# bugs ✅ FIXED (Session 2026-05-12)
- ✅ a volte, quando l'applicazione viene messa in background non viene poi ripristinata correttamente: perde il workspace e apre quello di default → **BUG-001** (resolved by TASK-054 workspace persistence)
- ✅ ad un certo livello di ingrandimento di zoom, spariscono i nodi dalla timeline e rimangono le connessioni → **BUG-002** (increased culling buffer + zoom threshold)

---

**Implementation Report**: See `COMMUNICATION/REPORTS/REPORT-018-FEEDBACK011-IMPLEMENTATION.md`  
**Date**: 2026-05-12  
**Agent**: Claude Code (Sonnet 4.5)  
**Status**: All feedback items implemented ✅