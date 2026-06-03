# FEEDBACK012 Implementation Plan

## Requirements Analysis

### R1: Timeline sempre selezionata
- **Current**: `App.tsx` line 23: `useState<LayoutMode>('timeline')` ✅ ALREADY IMPLEMENTED
- **Action**: None needed

### R2: Rimuovi "Group by category"
- **Current**: `Toolbar.tsx` ha bottone "Group by Category" (lines 27-35)
- **Action**: Rimuovere questo bottone dal JSX, mantenere solo "Timeline View"
- **Impact**: La toolbar diventa più semplice, solo toggle timeline on/off

### R3: Timeline a tutta larghezza
- **Current**: `Graph.tsx` usa `zoomToFit(400, 60)` quando entra in timeline mode
- **Verification needed**: Verificare se già funziona o serve adjustment
- **Action**: Confermare con E2E test

### R4: Tutte le categorie sempre selezionate
- **Current**: `Toolbar.tsx` ha dropdown per filtrare categorie (lines 45-57)
- **Current**: `Graph.tsx` usa `groupFilter` per mostrare solo lane filtrate (line 257, 792)
- **Action**: 
  - Rimuovere dropdown filtro da Toolbar
  - Modificare Graph.tsx per mostrare TUTTE le lane sempre (rimuovere condizione su groupFilter)
  - Rimuovere prop `groupFilter` dall'interfaccia

### R5: Category boxes a tutta larghezza sotto timeline
- **Current**: `computeTimelineLanes()` calcola lane con `hw = canvasW / 2 - PAD_X`
- **Current**: Le lane sono disegnate solo quando `groupFilter` è attivo
- **Action**:
  - Le lane devono essere **sempre visibili** in timeline mode
  - Ogni nodo deve essere **confinato** nella sua lane con forze di contenimento
  - Ordine verticale: Timeline → Task box → Persona box → Component box
  - Note: FEEDBACK012 non menziona "objective" e "note" — da confermare con utente

### R6: Nodi confinati in box con padding
- **Current**: I nodi hanno forze di contenimento solo quando `groupFilter` è attivo
- **Action**: Aggiungere forze di contenimento per TUTTI i nodi nelle rispettive lane

### R7: Task nodes biased verso sinistra
- **Current**: No bias specifico implementato
- **Action**: Aggiungere forza attrattiva verso il lato sinistro del box per nodi di tipo 'task'

## Implementation Strategy

### CRITICAL CHANGES (rendering-sensitive)
1. **Graph.tsx**: Rimozione condizione `groupFilter` per rendering lane
2. **Graph.tsx**: Forze di contenimento lane sempre attive (non solo quando filtrato)
3. **Graph.tsx**: Aggiunta bias verso sinistra per task nodes
4. **layout.ts**: Potenziale adjustment ordine lane (confermare ordine)

### SAFE CHANGES (UI-only, no rendering)
1. **Toolbar.tsx**: Rimozione bottone "Group by category"
2. **Toolbar.tsx**: Rimozione dropdown filtro categorie
3. **App.tsx**: Rimozione state `groupFilter`

## Verification Protocol

### Step 1: Code Changes
- Implementare modifiche in ordine logico
- Usare commenti `// FEEDBACK012` per tracciabilità

### Step 2: Unit Test Updates
- `tests/layout.test.ts`: Verificare che `computeTimelineLanes` restituisca lane corrette
- Nessun cambio necessario se ordine lane non cambia

### Step 3: E2E Visual Verification (MANDATORY)
```bash
npm run test:e2e:headed
```

**Checklist visuale**:
- [ ] Timeline view attiva di default all'apertura
- [ ] No bottone "Group by category" in toolbar
- [ ] No dropdown filtro categorie
- [ ] Visibili 3 box sotto timeline: Task, Persona, Component
- [ ] Box occupano tutta la larghezza della timeline
- [ ] Nodi Task confinati nel box Task (con padding visibile dai bordi)
- [ ] Nodi Persona confinati nel box Persona
- [ ] Nodi Component confinati nel box Component
- [ ] Nodi Task tendono verso sinistra del box
- [ ] Objectives sopra timeline (comportamento existing)

### Step 4: Manual Testing (if needed)
Se E2E non cattura qualcosa:
- Aprire app in dev mode: `npm run dev`
- Caricare test vault: `tests/fixtures/test-vault/`
- Verificare visivamente i punti della checklist

## Questions for User
1. **Objectives e Note**: FEEDBACK012 menziona solo Task/Persona/Component boxes. Dove vanno Objectives e Note?
   - Ipotesi: Objectives rimangono sopra timeline (come ora)
   - Ipotesi: Note vanno in un box sotto Component?
   
2. **Ordine verticale boxes**: FEEDBACK012 dice "Task below timeline, Persona below Task, Component below Persona"
   - Confermare: Timeline → Task → Persona → Component (dall'alto verso il basso)

## Risk Mitigation

### Known Issue: Precedenti rendering bugs
- **Root cause**: Modifiche a forze D3 senza verifica visuale
- **Mitigation**: 
  - Run E2E dopo OGNI modifica al rendering
  - NO batch di modifiche — una feature alla volta
  - Screenshot comparison con stato precedente

### Rollback Plan
Se qualcosa non funziona:
```bash
git diff HEAD -- src/components/Graph.tsx src/lib/layout.ts
```
Verificare ogni singola modifica e testare incrementalmente.

## Implementation Order

1. ✅ TASK-1: Analisi requirements (DONE)
2. **TASK-2**: Timeline default (già implementato, verificare)
3. **TASK-3**: Rimuovere UI elements (toolbar button + dropdown)
4. **TASK-4**: Rimuovere groupFilter state + prop
5. **TASK-5**: Modificare rendering lane (sempre visibili)
6. **TASK-6**: Forze contenimento sempre attive
7. **TASK-7**: Bias task nodes verso sinistra
8. **E2E CHECKPOINT**: Run tests, verify screenshots
9. **TASK-8**: Aggiustamenti finali se necessario
