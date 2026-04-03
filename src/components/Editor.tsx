/* Hermes Markdown editor powered by CodeMirror 6 (TASK-009).
   Features: syntax highlighting, YAML frontmatter, [[wiki-link]] autocomplete,
   metadata sync callback, and debounced auto-save. */
import { useCallback, useEffect, useRef } from 'react';
import { EditorView, keymap, placeholder as cmPlaceholder } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands';
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
} from '@codemirror/autocomplete';
import {
  bracketMatching,
  defaultHighlightStyle,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete';

// ── Auto-save debounce helper ───────────────────────────────────────────────

function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return ((...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as unknown as T;
}

// ── Props ───────────────────────────────────────────────────────────────────

export interface EditorProps {
  /** Full markdown source (frontmatter + body). */
  content: string;
  /** Titles of all pages in the vault — used for [[wiki-link]] autocomplete. */
  pageTitles: string[];
  /** Called on every document change. */
  onChange(content: string): void;
  /** If true the editor is read-only (no vault loaded). */
  readOnly?: boolean;
}

// ── Dark theme ──────────────────────────────────────────────────────────────

const hermesEditorTheme = EditorView.theme(
  {
    '&': {
      height: '100%',
      fontSize: '14px',
      fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Mono', monospace",
    },
    '.cm-content': {
      caretColor: '#7c6af7',
      padding: '12px 0',
    },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#7c6af7' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: 'rgba(124, 106, 247, 0.22) !important',
    },
    '.cm-gutters': {
      background: '#1e1e24',
      color: '#555566',
      border: 'none',
      minWidth: '36px',
    },
    '.cm-activeLineGutter': { background: 'rgba(124,106,247,0.08)' },
    '.cm-activeLine': { background: 'rgba(255,255,255,0.03)' },
    '.cm-tooltip': {
      background: '#252530',
      border: '1px solid rgba(255,255,255,0.1)',
      color: '#c8c8d4',
    },
    '.cm-tooltip-autocomplete ul li[aria-selected]': {
      background: 'rgba(124,106,247,0.22)',
      color: '#e0e0f0',
    },
  },
  { dark: true },
);

// ── Component ───────────────────────────────────────────────────────────────

export function Editor({ content, pageTitles, onChange, readOnly }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const readOnlyComp = useRef(new Compartment());
  const titlesRef = useRef(pageTitles);
  titlesRef.current = pageTitles;

  // Keep a stable reference to the latest onChange.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // ── Wiki-link autocomplete function ─────────────────────────────────────
  const wikiComplete = useCallback(
    (ctx: CompletionContext): CompletionResult | null => {
      // Match trigger: [[ followed by optional text (no ] allowed).
      const match = ctx.matchBefore(/\[\[[^\]]*$/);
      if (!match) return null;
      const from = match.from + 2; // after the [[
      const filter = ctx.state.doc.sliceString(from, ctx.pos).toLowerCase();

      const options = titlesRef.current
        .filter((t) => t.toLowerCase().includes(filter))
        .map((t) => ({
          label: t,
          apply: `${t}]]`,
          type: 'text' as const,
        }));

      return { from, options, filter: false };
    },
    [],
  );

  // ── Create the editor view once. Re-dispatch content when prop changes. ─
  useEffect(() => {
    if (!containerRef.current) return;

    const debouncedChange = debounce((doc: string) => {
      onChangeRef.current(doc);
    }, 500);

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        debouncedChange(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: content,
      extensions: [
        hermesEditorTheme,
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        history(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion({ override: [wikiComplete] }),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab,
        ]),
        cmPlaceholder('Start writing Markdown…'),
        EditorView.lineWrapping,
        readOnlyComp.current.of(EditorState.readOnly.of(!!readOnly)),
        updateListener,
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Intentionally run only on mount. Content changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external content changes (e.g. switching to another page).
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== content) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: content },
      });
    }
  }, [content]);

  // Sync readOnly flag.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: readOnlyComp.current.reconfigure(EditorState.readOnly.of(!!readOnly)),
    });
  }, [readOnly]);

  return (
    <div
      ref={containerRef}
      className="editor-container"
      data-testid="hermes-editor"
    />
  );
}
