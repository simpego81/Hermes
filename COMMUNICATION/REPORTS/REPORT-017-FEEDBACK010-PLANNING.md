# REPORT-017-FEEDBACK010-PLANNING

**Data:** 2026-04-30  
**Autore:** Gemini CLI (Direttore Tecnico)  
**Status:** DEFINITO  

## Sintesi
Il FEEDBACK010 ha evidenziato la necessità di migliorare l'efficienza dell'Editor (creazione rapida nodi), risolvere un bug critico di salvataggio e rifinire l'estetica e l'organizzazione della Timeline. Inoltre, il team è stato aggiornato: Claude Code assume il ruolo di Senior Full-Stack Engineer, integrando le responsabilità precedentemente in capo a Manus.

## Analisi Tecnica & Strategia
1. **Editor Quick Flow**: Introduzione di trigger `@` e `[[` per accelerare la creazione di Persona e Pagine. Questo richiederà l'integrazione di listener di tastiera nell'Editor e l'invocazione di modali di creazione rapida.
2. **Persistence Fix**: Il salvataggio dei file è prioritario. Si sospetta un problema nel passaggio dei dati tra il frontend React e il backend Electron via IPC.
3. **Timeline Geometry**:
   - Passaggio a un layout "Full Width".
   - Evoluzione degli Objective da nodi circolari a "Flag" (rettangoli con marker), con logica di stacking verticale.
   - Categorizzazione verticale rigorosa (Stratificazione: Objective > Task > Persona) per eliminare il rumore visivo e le sovrapposizioni.
   - Label delle Persona verticali e sempre visibili per una rapida identificazione dei nodi.

## Task Creati
- **TASK-045**: Creazione rapida Persona (@) e Pagine ([[).
- **TASK-046**: Fix bug salvataggio (CRITICO).
- **TASK-047**: Refinement UI Timeline (Flags, Label verticali, Full width).
- **TASK-048**: Layering verticale e Anti-collisione Timeline.

## Prossimi Passi
Claude Code inizierà con la risoluzione del bug di salvataggio (TASK-046) per garantire la stabilità operativa, proseguendo poi con le implementazioni dell'Editor e della Timeline.
