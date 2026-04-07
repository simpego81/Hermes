# TASK-042-MANUS-EDITOR-STABILITY-SHORTCUTS

**Agent:** Manus (R&D)  
**Status:** ⏳ PENDING  
**Priority:** HIGH  

---

## Obiettivo
Migliorare la stabilità dell'editor e correggere shortcut/comportamenti anomali.

## Requisiti
1. **Editor Cursor Stability**: Risolvere il problema del cursore che "salta" o cancella spazi a fine linea durante l'editing. Mantenere la selezione corrente quando si aggiorna il documento dai props.
2. **Posizionamento Iniziale**: Quando si apre una pagina, il cursore deve trovarsi alla fine del file per impostazione predefinita.
3. **Shortcut `Ctrl+W`**: Implementare la chiusura della pagina corrente (deselezione dell'ID attivo) invece della chiusura dell'applicazione.
4. **Shortcut `Ctrl+G`**: Correggere il toggle. Deve massimizzare/ripristinare il pannello del grafo, non attivare il fullscreen della pagina.

## Consegna
- Modifiche a `src/components/Editor.tsx` e `src/App.tsx`.
- Eventuale logica IPC in `main.ts` se `Ctrl+W` è gestito via menu.
