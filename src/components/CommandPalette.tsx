/* Hermes Command Palette — Ctrl+P quick navigation & commands (TASK-013). */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { HermesPage } from '../lib/types';

export interface PaletteCommand {
  id: string;
  label: string;
  action: () => void;
}

interface CommandPaletteProps {
  pages: HermesPage[];
  commands: PaletteCommand[];
  onNavigate: (pageId: string) => void;
  onClose: () => void;
}

/** Simple fuzzy-ish match: every character of the query must appear in order. */
function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

export function CommandPalette({ pages, commands, onNavigate, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Build combined results: pages + commands.
  const results = useMemo(() => {
    const q = query.trim();
    const pageResults = pages
      .filter((p) => !q || fuzzyMatch(q, p.title))
      .map((p) => ({ id: p.id, label: p.title, kind: 'page' as const }));

    const cmdResults = commands
      .filter((c) => !q || fuzzyMatch(q, c.label))
      .map((c) => ({ id: c.id, label: c.label, kind: 'command' as const }));

    return [...cmdResults, ...pageResults];
  }, [pages, commands, query]);

  // Reset selection when results change.
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length]);

  // Auto-focus input on mount.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Scroll selected item into view.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const el = list.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const accept = useCallback(
    (index: number) => {
      const item = results[index];
      if (!item) return;
      if (item.kind === 'command') {
        const cmd = commands.find((c) => c.id === item.id);
        cmd?.action();
      } else {
        onNavigate(item.id);
      }
      onClose();
    },
    [results, commands, onNavigate, onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          accept(selectedIndex);
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [results.length, selectedIndex, accept, onClose],
  );

  return (
    <div className="palette-overlay" onClick={onClose}>
      <div className="palette" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <input
          ref={inputRef}
          className="palette-input"
          type="text"
          placeholder="Search pages or type a command…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {results.length > 0 ? (
          <ul ref={listRef} className="palette-list">
            {results.map((item, i) => (
              <li
                key={item.id}
                className={`palette-item${i === selectedIndex ? ' selected' : ''}`}
                onMouseEnter={() => setSelectedIndex(i)}
                onClick={() => accept(i)}
              >
                <span className="palette-item-kind">
                  {item.kind === 'command' ? '⌘' : '📄'}
                </span>
                <span className="palette-item-label">{item.label}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="palette-empty">No results</div>
        )}
      </div>
    </div>
  );
}
