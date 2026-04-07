# TASK-013-MANUS-COMMAND-PALETTE

**Agent:** Manus (R&D)  
**Status:** ⏳ PENDING  
**Priority:** MEDIUM  

---

## Obiettivo
Implementare una Command Palette (stile Obsidian `Ctrl+P`) per la navigazione rapida e l'esecuzione di comandi.

## Requisiti
1. **Interfaccia**: Componente modale centrato che appare alla pressione di `Ctrl+P` (o tramite voce di menu).
2. **Funzionalità**:
   - Ricerca fuzzy tra i titoli di tutte le pagine.
   - Navigazione tra i risultati con le frecce e selezione con `Enter`.
   - Integrazione di comandi rapidi (es. "Toggle Graph", "New Page").
3. **UX**: Deve chiudersi con `Esc` o cliccando all'esterno.

## Consegna
- Nuovo componente `src/components/CommandPalette.tsx`.
- Integrazione in `src/App.tsx`.
