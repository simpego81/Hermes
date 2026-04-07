# TASK-041-MANUS-LAYOUT-REFACTOR-TASK-LIST

**Agent:** Manus (R&D)  
**Status:** ⏳ PENDING  
**Priority:** HIGH  

---

## Obiettivo
Rivoluzionare il layout principale e implementare la lista dei task con calcolo di priorità.

## Requisiti
1. **Layout**:
   - Spostare il **Graph** nella parte superiore (Top) dell'area centrale.
   - Posizionare l'**Editor** al di sotto del Graph.
   - Aggiungere una **Task List** (non editabile) nella parte destra del layout.
2. **Task List**:
   - **Sezione Superiore**: Task con `status: TO-DO`.
   - **Sezione Inferiore**: Task con `status: WAITING`.
   - **Ordinamento**: Entrambe le liste devono essere ordinate per **Priorità Crescente**.
3. **Algoritmo di Priorità**:
   - La priorità di un task è `MAX(priorità dei task linkati da esso) + 1`.
   - Se un task non ha link o i link non sono task, la priorità è `0`.
   - Implementare il calcolo in modo efficiente per evitare cicli infiniti.
4. **Colors**: I task con `status: DONE` nel grafo devono avere un colore "arancio-grigio" (es. `#A09080`).

## Consegna
- Modifiche a `src/App.tsx`, `src/styles.css` e nuovi componenti per la Task List.
- Utility per il calcolo della priorità in `src/lib/vault.ts`.
