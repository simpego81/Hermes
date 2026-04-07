/* Hermes Task List panel — shows TO-DO and WAITING tasks sorted by priority (TASK-041). */
import { useMemo } from 'react';
import { computeTaskPriorities } from '../lib/vault';
import type { HermesPage } from '../lib/types';

interface TaskListProps {
  pages: HermesPage[];
  selectedId: string | null;
  onSelect(id: string): void;
}

export function TaskList({ pages, selectedId, onSelect }: TaskListProps) {
  const ranked = useMemo(() => computeTaskPriorities(pages), [pages]);

  const todoTasks = useMemo(
    () => ranked.filter((t) => t.page.metadata.status === 'TO-DO').sort((a, b) => a.priority - b.priority),
    [ranked],
  );

  const waitingTasks = useMemo(
    () => ranked.filter((t) => t.page.metadata.status === 'WAITING').sort((a, b) => a.priority - b.priority),
    [ranked],
  );

  return (
    <aside className="task-list-panel">
      <div className="task-list-header">Task List</div>

      <section className="task-list-section">
        <div className="task-list-section-title">TO-DO ({todoTasks.length})</div>
        {todoTasks.length === 0 && <div className="task-list-empty">No tasks</div>}
        <ul className="task-list-items">
          {todoTasks.map((t) => (
            <li
              key={t.page.id}
              className={`task-list-item${t.page.id === selectedId ? ' active' : ''}`}
              onClick={() => onSelect(t.page.id)}
            >
              <span className="task-list-item-title">{t.page.title}</span>
              <span className="task-list-item-priority">P{t.priority}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="task-list-section">
        <div className="task-list-section-title">WAITING ({waitingTasks.length})</div>
        {waitingTasks.length === 0 && <div className="task-list-empty">No tasks</div>}
        <ul className="task-list-items">
          {waitingTasks.map((t) => (
            <li
              key={t.page.id}
              className={`task-list-item${t.page.id === selectedId ? ' active' : ''}`}
              onClick={() => onSelect(t.page.id)}
            >
              <span className="task-list-item-title">{t.page.title}</span>
              <span className="task-list-item-priority">P{t.priority}</span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
