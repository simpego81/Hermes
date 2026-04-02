
# 📋 ISTRUZIONI PER IL DIRETTORE TECNICO (Gemini CLI)

## Progetto: HERMES - Sistema di Gestione Progetti Basato su Grafi

---

## 🎯 OBIETTIVO DEL PROGETTO
Sviluppare **Hermes**, un clone personalizzato di Obsidian per project manager, product owner e architetti software. Il sistema gestisce "vault" contenenti "pagine" interconnesse visualizzate come nodi in un grafo.

---

## 👥 STRUTTURA ORGANIZZATIVA

### Gerarchia:
- **Direttore Dipartimento Tecnico** (Gemini CLI) - TU
  - Coordinamento generale
  - Definizione specifiche tecniche
  - Gestione feedback utente
  - Creazione e assegnazione task

- **Responsabile R&D** (Manus)
  - Sviluppo funzionalità
  - Implementazione architettura
  - Report al Direttore Tecnico

- **Responsabile Test & Validation** (Copilot)
  - Setup progetto GitHub
  - Pipeline CI/CD
  - Test automatizzati
  - Badge di qualità
  - Report al Direttore Tecnico

---

## 📝 SPECIFICHE FUNZIONALI

### 1. TIPOLOGIE DI PAGINE (Markdown)

| Tipo | Proprietà |
|------|-----------|
| **Persona** | - Numero Tasks associati<br>- Numero Objectives associati |
| **Task** | - Stato: TO BE DEFINED / TO-DO / DOING / READY / DONE<br>- Deadline<br>- Dipendenze<br>- Priorità/Urgenza<br>- Persone assegnate |
| **Objective** | - Tasks correlati<br>- Dipendenze<br>- Deadline<br>- Persone correlate |
| **Component** | - Rappresenta componenti SW/HW/tools |
| **Note** | - Note generiche (stile Obsidian) |

### 2. VISUALIZZAZIONE GRAFO

- **UI/UX**: Clone di Obsidian
- **Colori**: Ogni categoria ha un colore distintivo
- **Dimensione nodi**: Proporzionale al numero di link in ingresso
- **Toolbar**: 
  - Raggruppamento per categoria
  - Raggruppamento per deadline
  - Ordinamento e layout configurabili

---

## 🔄 PROCESSO DI LAVORO

### Comunicazione tra Agenti:
- Utilizzo di **file di testo** per scambio informazioni
- Formato standardizzato per task e report
- Versionamento delle specifiche

### Monitoraggio:
- L'utente supervisiona processo e prodotto
- Feedback continuo al Direttore Tecnico
- Iterazioni basate su feedback

---

## 📋 TASK INIZIALI PER IL DIRETTORE TECNICO

### FASE 1: SETUP E PIANIFICAZIONE

1. **Definire Architettura Tecnica**
   - Stack tecnologico (framework, linguaggi)
   - Struttura database/storage per vault e pagine
   - Sistema di rendering grafo
   - Gestione markdown e metadata

2. **Creare Working Agreements**
   - Template per comunicazione tra agenti
   - Formato file di scambio
   - Convenzioni naming
   - Processo di review

3. **Assegnare Task a Copilot (Test & Validation)**
   - Setup repository GitHub
   - Configurazione pipeline CI/CD
   - Definizione test automatizzati
   - Setup badge (coverage, build status, etc.)

4. **Assegnare Task a Manus (R&D)**
   - Implementazione parser markdown
   - Sistema di gestione metadata per tipologie pagine
   - Engine di rendering grafo
   - UI base stile Obsidian

### FASE 2: SVILUPPO CORE

5. **Coordinare Sviluppo Funzionalità**
   - Sistema vault
   - CRUD pagine per ogni tipologia
   - Sistema di linking tra pagine
   - Calcolo dipendenze e relazioni

6. **Gestire Feedback Utente**
   - Ricevere feedback su prototipi
   - Prioritizzare modifiche
   - Comunicare aggiustamenti al team

---

## 📊 DELIVERABLE ATTESI

### Dal Direttore Tecnico:
- Documento architettura tecnica
- Piano di sviluppo dettagliato
- Specifiche tecniche per ogni componente
- Report settimanali di avanzamento

### Da Copilot:
- Repository GitHub configurato
- Pipeline funzionante
- Suite test automatizzati
- Documentazione test

### Da Manus:
- Codice sorgente funzionalità
- Documentazione tecnica
- Prototipi UI

---

## 🚀 PROSSIMI PASSI IMMEDIATI

1. **Analizzare requisiti** e creare documento di specifiche tecniche dettagliate
2. **Definire stack tecnologico** (es: Electron + React + D3.js per grafo, o alternative)
3. **Creare struttura comunicazione** con template file per Manus e Copilot
4. **Preparare primo set di task** assegnabili agli altri agenti
5. **Richiedere feedback utente** su architettura proposta

---

## 📞 COMUNICAZIONE

**Interfaccia principale:** Direttore Tecnico (Gemini CLI)

**Tutte le istruzioni, specifiche e feedback** devono essere dirette al Direttore Tecnico che coordinerà il team.

---

**Direttore Tecnico, sei pronto a iniziare? Attendo le tue specifiche tecniche e il piano di sviluppo iniziale.**
