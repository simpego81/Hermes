# HERMES - Architettura Tecnica v1.0

## Stack Tecnologico
- **Desktop Runtime**: Electron
- **Frontend**: React (TypeScript)
- **Styling**: Vanilla CSS (Custom Properties per temi e colori categorie)
- **Graph Rendering**: D3.js / react-force-graph
- **Markdown Engine**: Remark / Rehype (Unified.js)
- **Metadata Management**: YAML Frontmatter
- **State Management**: React Context / Zustand
- **Database/Indexing**: SQLite (opzionale per performance su vault grandi) o In-memory Indexing.

## Struttura del Vault
Il Vault è una cartella locale contenente:
- `.hermes/`: Cartella di configurazione e indici.
- `Pagine/`: File `.md` organizzati liberamente.

## Modello Dati (Metadata YAML)
Ogni file Markdown conterrà metadati nel frontmatter per definire la tipologia e le proprietà.

### Esempio Task:
```yaml
type: task
status: TO-DO
deadline: 2026-04-15
priority: HIGH
assignees: [[Mario Rossi]]
dependencies: [[TASK-001]]
```

## Sistema di Rendering Grafo
- **Nodi**: Colorati in base alla proprietà `type`.
- **Dimensione**: `size = base_size + (incoming_links * scale_factor)`.
- **Layout**: Force-directed layout con vincoli per le aggregazioni (Timeline e Categorie).

## Roadmap Tecnica
1. **MVP**: Parser Markdown + Visualizzazione Grafo Base.
2. **Feature Set 1**: Gestione Categorie e Metadati.
3. **Feature Set 2**: Toolbar di Aggregazione (Timeline/Box).
4. **Final**: UI Polishing e Performance.
