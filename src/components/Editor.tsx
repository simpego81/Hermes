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
  acceptCompletion,
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
import { PAGE_SCHEMAS } from '../lib/schema';
import type { SchemaField } from '../lib/schema';

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
  /** Titles of persona pages only — used for @mention autocomplete. */
  personaTitles: string[];
  /** Called on every document change. */
  onChange(content: string): void;
  /** If true the editor is read-only (no vault loaded). */
  readOnly?: boolean;
  /** Called when user presses Ctrl+Enter to cycle task status. */
  onCycleStatus?: () => void;
  /** Called when user Ctrl+Clicks a [[wiki-link]]. */
  onLinkClick?: (title: string) => void;
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

export function Editor({ content, pageTitles, personaTitles, onChange, readOnly, onCycleStatus, onLinkClick }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const readOnlyComp = useRef(new Compartment());
  const titlesRef = useRef(pageTitles);
  titlesRef.current = pageTitles;

  const personaTitlesRef = useRef(personaTitles);
  personaTitlesRef.current = personaTitles;

  // Keep a stable reference to the latest onChange.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const onCycleStatusRef = useRef(onCycleStatus);
  onCycleStatusRef.current = onCycleStatus;

  const onLinkClickRef = useRef(onLinkClick);
  onLinkClickRef.current = onLinkClick;

  // ── Wiki-link autocomplete function ─────────────────────────────────────
  const wikiComplete = useCallback(
    (ctx: CompletionContext): CompletionResult | null => {
      // Match trigger: [[ followed by optional text (no ] allowed).
      const match = ctx.matchBefore(/\[\[[^\]]*$/);
      if (!match) return null;
      const from = match.from + 2; // after the [[

      // Check if ]] already exists right after cursor (e.g. from closeBrackets)
      const docLen = ctx.state.doc.length;
      const afterCursor = ctx.state.doc.sliceString(ctx.pos, Math.min(ctx.pos + 2, docLen));
      const hasClosing = afterCursor === ']]';

      const filter = ctx.state.doc.sliceString(from, ctx.pos).toLowerCase();

      const options = titlesRef.current
        .filter((t) => t.toLowerCase().includes(filter))
        .map((t) => ({
          label: t,
          apply: hasClosing ? t : `${t}]]`,
          type: 'text' as const,
        }));

      return { from, options, filter: false };
    },
    [],
  );

  // ── @mention autocomplete for persona pages (TASK-024) ──────────────────
  const mentionComplete = useCallback(
    (ctx: CompletionContext): CompletionResult | null => {
      // Match trigger: @ followed by optional non-whitespace text.
      const match = ctx.matchBefore(/@[^\s@]*$/);
      if (!match) return null;
      const from = match.from + 1; // after the @
      const filter = ctx.state.doc.sliceString(from, ctx.pos).toLowerCase();

      const options = personaTitlesRef.current
        .filter((t) => t.toLowerCase().includes(filter))
        .map((t) => ({
          label: t,
          apply: `[[${t}]]`,
          detail: 'persona',
          type: 'text' as const,
        }));

      return { from: match.from, options, filter: false };
    },
    [],
  );

  // ── Frontmatter value autocomplete (TASK-033) ─────────────────────────────
  // Suggests enum values when cursor is after `status: ` or `priority: ` etc.
  const frontmatterComplete = useCallback(
    (ctx: CompletionContext): CompletionResult | null => {
      // Check if we're inside YAML frontmatter (between --- delimiters)
      const doc = ctx.state.doc.toString();
      const pos = ctx.pos;
      const firstDelim = doc.indexOf('---');
      if (firstDelim !== 0) return null;
      const secondDelim = doc.indexOf('---', 3);
      if (secondDelim === -1 || pos > secondDelim) return null;

      // Match `key: value` pattern on current line
      const line = ctx.state.doc.lineAt(pos);
      const lineText = line.text;
      const colonIdx = lineText.indexOf(':');
      if (colonIdx === -1) return null;

      const key = lineText.slice(0, colonIdx).trim();
      const afterColon = colonIdx + 1;
      const valueStart = line.from + afterColon;
      // Cursor must be after the colon
      if (pos < valueStart) return null;

      // Find matching schema field across all page types
      let field: SchemaField | undefined;
      for (const schema of Object.values(PAGE_SCHEMAS)) {
        if (key in schema) {
          field = schema[key];
          break;
        }
      }

      if (!field || field.type !== 'enum' || !field.options) return null;

      // Skip whitespace after colon to determine the 'from' position
      const textAfterColon = lineText.slice(afterColon);
      const leadingSpaces = textAfterColon.length - textAfterColon.trimStart().length;
      const from = valueStart + leadingSpaces;

      const options = field.options.map((opt) => ({
        label: opt,
        type: 'keyword' as const,
      }));

      return { from, options };
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
                autocompletion({ override: [frontmatterComplete, wikiComplete, mentionComplete] }),
        keymap.of([
          { key: 'Tab', run: acceptCompletion },
          {
            key: 'Ctrl-Enter',
            run: () => {
              onCycleStatusRef.current?.();
              return true;
            },
          },
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab,
        ]),
        cmPlaceholder('Start writing Markdown…'),
        EditorView.lineWrapping,
        readOnlyComp.current.of(EditorState.readOnly.of(!!readOnly)),
        updateListener,
        // Ctrl+Click handler for [[wiki-links]] (TASK-036)
        EditorView.domEventHandlers({
          click(event: MouseEvent, view: EditorView) {
            if (!event.ctrlKey && !event.metaKey) return false;
            const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
            if (pos === null) return false;
            // Scan outward from click position to find enclosing [[ ... ]]
            const doc = view.state.doc.toString();
            // Find [[ before pos
            let start = -1;
            for (let i = pos; i >= 1; i--) {
              if (doc[i] === '[' && doc[i - 1] === '[') { start = i + 1; break; }
              if (doc[i] === ']') break; // hit a closing bracket first
            }
            if (start === -1) return false;
            // Find ]] after pos
            let end = -1;
            for (let i = pos; i < doc.length - 1; i++) {
              if (doc[i] === ']' && doc[i + 1] === ']') { end = i; break; }
              if (doc[i] === '[' && i > pos) break;
            }
            if (end === -1) return false;
            const title = doc.slice(start, end).trim();
            if (title && onLinkClickRef.current) {
              event.preventDefault();
              onLinkClickRef.current(title);
              return true;
            }
            return false;
          },
        }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    // Position cursor at the end of the document on initial open (TASK-042)
    view.dispatch({ selection: { anchor: content.length } });

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
      // Preserve cursor position when content changes from props (e.g. metadata sync)
      const prevSelection = view.state.selection;
      const newLen = content.length;
      view.dispatch({
        changes: { from: 0, to: current.length, insert: content },
        // Clamp selection to new document bounds
        selection: { anchor: Math.min(prevSelection.main.anchor, newLen), head: Math.min(prevSelection.main.head, newLen) },
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
