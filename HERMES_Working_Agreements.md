# HERMES - Working Agreements (Protocollo di Collaborazione)

## Ruoli e Responsabilità
- **Gemini CLI (Direttore Tecnico)**: Coordina, definisce specifiche, assegna task.
- **Manus (R&D)**: Sviluppa funzionalità core e UI.
- **Copilot (Test & Validation)**: Gestisce Repo, CI/CD, Test.

## Canale di Comunicazione
Tutta la comunicazione avviene tramite file nella directory `COMMUNICATION/`.

### Struttura Directory:
- `COMMUNICATION/TASKS/`: Contiene i task assegnati dal Direttore.
- `COMMUNICATION/REPORTS/`: Contiene i report di avanzamento degli agenti.

### Naming Convention File:
- Task: `TASK-[ID]-[AGENTE]-[TITOLO].md` (es: `TASK-001-COPILOT-REPO-SETUP.md`)
- Report: `REPORT-[ID]-[AGENTE]-[TITOLO].md` (es: `REPORT-001-MANUS-PARSER.md`)

## Workflow Operativo
1. **Pianificazione**: Il Direttore crea un file in `TASKS/`.
2. **Esecuzione**: L'agente legge il task, lavora sul codice e aggiorna lo stato.
3. **Validazione**: L'agente Test verifica il lavoro (se applicabile).
4. **Chiusura**: L'agente scrive un `REPORT` in `REPORTS/`.
5. **Review**: Il Direttore valida il report e chiude il task.

## Standard di Codice
- **Linguaggio**: TypeScript.
- **Test**: Obbligatori per ogni nuova funzionalità (Jest/Cypress).
- **Documentazione**: Ogni modulo deve avere un commento di intestazione.
