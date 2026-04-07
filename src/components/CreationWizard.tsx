/* Hermes Creation Wizard — modal for guided page creation (TASK-023, TASK-029 fast keyboard). */
import { useCallback, useEffect, useRef, useState } from 'react';
import { BOX_TYPE_ORDER } from '../lib/layout';
import { PAGE_TYPE_LABELS } from '../lib/types';
import type { PageType } from '../lib/types';

const TYPE_SHORTCUTS: Record<string, PageType> = {
  n: 'note',
  t: 'task',
  o: 'objective',
  p: 'persona',
  c: 'component',
};

interface CreationWizardProps {
  prefilledName?: string | null;
  onConfirm(name: string, type: PageType): void;
  onClose(): void;
}

export function CreationWizard({ prefilledName, onConfirm, onClose }: CreationWizardProps) {
  const [name, setName] = useState(prefilledName ?? '');
  const [pageType, setPageType] = useState<PageType | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Step 1: wait for single-key type selection
  useEffect(() => {
    if (pageType !== null) return; // already selected
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      const mapped = TYPE_SHORTCUTS[e.key.toLowerCase()];
      if (mapped) {
        e.preventDefault();
        setPageType(mapped);
        // If name is pre-filled, confirm immediately on type selection
        if (prefilledName) {
          onConfirm(prefilledName, mapped);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pageType, onClose, prefilledName, onConfirm]);

  // Step 2: auto-focus name input once type is chosen
  useEffect(() => {
    if (pageType !== null) {
      inputRef.current?.focus();
    }
  }, [pageType]);

  // Close on Escape while in step 2
  useEffect(() => {
    if (pageType === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pageType, onClose]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = name.trim();
      if (!trimmed || !pageType) return;
      onConfirm(trimmed, pageType);
    },
    [name, pageType, onConfirm],
  );

  return (
    <div className="wizard-overlay" onClick={onClose}>
      <form
        className="wizard"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2 className="wizard-title">Create New Page</h2>

        {pageType === null ? (
          /* Step 1: type selection */
          <>
            <p className="wizard-hint">Press a key to choose type:</p>
            <div className="wizard-type-grid">
              {BOX_TYPE_ORDER.map((t) => {
                const shortcut = Object.entries(TYPE_SHORTCUTS).find(([, v]) => v === t)?.[0]?.toUpperCase();
                return (
                  <button
                    key={t}
                    type="button"
                    className="wizard-type-btn"
                    onClick={() => {
                      setPageType(t);
                      if (prefilledName) {
                        onConfirm(prefilledName, t);
                      }
                    }}
                  >
                    <kbd className="wizard-kbd">{shortcut}</kbd> {PAGE_TYPE_LABELS[t]}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          /* Step 2: name input */
          <>
            <div className="wizard-selected-type" style={{ marginBottom: 8 }}>
              Type: <strong>{PAGE_TYPE_LABELS[pageType]}</strong>
            </div>
            <label className="wizard-label" htmlFor="wizard-name">
              Page Name
            </label>
            <input
              id="wizard-name"
              ref={inputRef}
              className="wizard-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter page name…"
              autoComplete="off"
            />
          </>
        )}

        <div className="wizard-actions">
          <button type="button" className="wizard-cancel" onClick={onClose}>
            Cancel
          </button>
          {pageType !== null && (
            <button
              type="submit"
              className="wizard-confirm"
              disabled={!name.trim()}
            >
              Create
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
