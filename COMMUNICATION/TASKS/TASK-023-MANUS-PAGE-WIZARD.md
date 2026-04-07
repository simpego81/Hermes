# TASK-023-MANUS-PAGE-WIZARD

**Agent:** Manus (R&D)  
**Status:** ⏳ PENDING  
**Priority:** HIGH  

---

## Obiettivo
Sostituire il dialog di sistema per `Ctrl+N` con un Wizard interno per la creazione guidata delle pagine.

## Requisiti
1. **Interfaccia**: Alla pressione di `Ctrl+N`, mostrare un modale (Wizard) che richieda:
   - Nome della pagina.
   - Tipo di pagina (Persona, Task, Objective, Component, Note).
2. **Automazione**: 
   - Creare il file `.md` nel vault con il frontmatter già popolato in base allo schema del tipo scelto.
   - Evitare l'uso di `saveDialog` di Electron per questa operazione.
3. **Bugfix**: Assicurarsi che lo shortcut funzioni solo se un vault è aperto, ma senza mostrare il popup errato se lo stato è già valido.

## Consegna
- Nuovo componente `src/components/CreationWizard.tsx`.
- Modifiche a `src/App.tsx`.
