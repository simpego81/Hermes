# TASK-029-MANUS-FAST-WIZARD

**Agent:** Manus (R&D)  
**Status:** ⏳ PENDING  
**Priority:** MEDIUM  

---

## Obiettivo
Migliorare il Wizard di creazione pagina per un inserimento rapido da tastiera.

## Requisiti
1. **Workflow**: Alla pressione di `Ctrl+N`, il wizard deve restare in attesa di un tasto singolo per il tipo:
   - `N` -> Note
   - `T` -> Task
   - `O` -> Objective
   - `P` -> Persona
   - `C` -> Component
2. **Step 2**: Dopo la selezione del tipo, attivare automaticamente il focus sulla casella di testo del Nome.
3. **Conferma**: `Enter` per creare la pagina e chiudere il wizard.

## Consegna
- Modifiche a `src/components/CreationWizard.tsx`.
