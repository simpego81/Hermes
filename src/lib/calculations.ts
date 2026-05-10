/* Hermes business logic calculations — aggregates, priorities, backlinks. */
import type { HermesPage } from './types';

// ── Backlinks & aggregate utilities ───────────────────────────────────────────

/** Return titles of all pages that contain a `[[wiki-link]]` to `targetTitle`. */
export function findBacklinks(pages: HermesPage[], targetTitle: string): string[] {
  return pages
    .filter((p) => p.links.includes(targetTitle))
    .map((p) => p.title);
}

export interface PersonaAggregates {
  taskCount: number;
  objectiveCount: number;
}

/** Count tasks assigned to a persona and objectives that reference them. */
export function getPersonaAggregates(
  pages: HermesPage[],
  personaTitle: string,
): PersonaAggregates {
  let taskCount = 0;
  let objectiveCount = 0;
  for (const p of pages) {
    if (p.type === 'task') {
      const assignees = p.metadata.assignees;
      const list = Array.isArray(assignees) ? assignees : assignees ? [assignees] : [];
      if (list.some((a) => a.replace(/^\[\[|]]$/g, '') === personaTitle)) {
        taskCount++;
      }
    }
    if (p.type === 'objective' && p.links.includes(personaTitle)) {
      objectiveCount++;
    }
  }
  return { taskCount, objectiveCount };
}

export interface ObjectiveAggregates {
  completedTasks: number;
  totalTasks: number;
}

/** Count related tasks and how many are DONE for an objective. */
export function getObjectiveAggregates(
  pages: HermesPage[],
  objectivePage: HermesPage,
): ObjectiveAggregates {
  const taskTitles = new Set(objectivePage.links);
  let total = 0;
  let completed = 0;
  for (const p of pages) {
    if (p.type === 'task' && taskTitles.has(p.title)) {
      total++;
      if (p.metadata.status === 'DONE') completed++;
    }
  }
  return { completedTasks: completed, totalTasks: total };
}

// ── Task priority algorithm ───────────────────────────────────────────────────

export interface TaskWithPriority {
  page: HermesPage;
  priority: number;
}

/**
 * Compute priority for each task page.
 * Priority = MAX(priority of linked tasks) + 1.
 * If a task has no links to other tasks, its priority is 0.
 * Handles cycles by returning 0 for any node in a cycle path.
 */
export function computeTaskPriorities(pages: HermesPage[]): TaskWithPriority[] {
  const tasks = pages.filter((p) => p.type === 'task');
  const taskByTitle = new Map(tasks.map((t) => [t.title, t]));
  const memo = new Map<string, number>();
  const visiting = new Set<string>();

  function dfs(title: string): number {
    if (memo.has(title)) return memo.get(title)!;
    if (visiting.has(title)) return 0; // cycle detected
    const task = taskByTitle.get(title);
    if (!task) return 0;
    visiting.add(title);
    let maxChild = -1;
    for (const link of task.links) {
      if (taskByTitle.has(link)) {
        maxChild = Math.max(maxChild, dfs(link));
      }
    }
    visiting.delete(title);
    const priority = maxChild >= 0 ? maxChild + 1 : 0;
    memo.set(title, priority);
    return priority;
  }

  return tasks.map((t) => ({ page: t, priority: dfs(t.title) }));
}
