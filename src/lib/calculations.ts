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
 * FEEDBACK011 — Multi-level task priority algorithm.
 *
 * Priority is computed using 3 levels (in order of precedence):
 * 1. Explicit priority field (HIGH > MEDIUM > LOW > undefined)
 * 2. Incoming links count (fewer incoming links = higher priority)
 * 3. Outgoing links to task/component/objective (more outgoing = higher priority)
 *
 * Lower score = higher priority (TaskList sorts ascending).
 *
 * Score formula:
 *   score = (explicitScore * 10000) + (incomingScore * 100) - outgoingScore
 *
 * Where:
 *   - explicitScore: HIGH=0, MEDIUM=1, LOW=2, undefined=3
 *   - incomingScore: count of backlinks (capped at 100)
 *   - outgoingScore: count of links to task/component/objective (capped at 100)
 */
export function computeTaskPriorities(pages: HermesPage[]): TaskWithPriority[] {
  const tasks = pages.filter((p) => p.type === 'task');

  // Build reverse link index: target title -> sources that link to it
  const backlinks = new Map<string, string[]>();
  pages.forEach((p) => {
    p.links.forEach((targetTitle) => {
      if (!backlinks.has(targetTitle)) backlinks.set(targetTitle, []);
      backlinks.get(targetTitle)!.push(p.title);
    });
  });

  return tasks.map((task) => {
    // Level 1: Explicit priority
    const explicitPriority = task.metadata.priority as string | undefined;
    const explicitScore =
      explicitPriority === 'HIGH' ? 0 :
      explicitPriority === 'MEDIUM' ? 1 :
      explicitPriority === 'LOW' ? 2 : 3;

    // Level 2: Incoming links (backlinks to this task)
    const incomingCount = (backlinks.get(task.title) ?? []).length;
    const incomingScore = Math.min(incomingCount, 100);

    // Level 3: Outgoing links to task/component/objective
    const relevantTypes = new Set(['task', 'component', 'objective']);
    const outgoingCount = task.links.filter((linkTitle) => {
      const target = pages.find((p) => p.title === linkTitle);
      return target && relevantTypes.has(target.type);
    }).length;
    const outgoingScore = Math.min(outgoingCount, 100);

    // Combine scores: lower total = higher priority
    const score = explicitScore * 10000 + incomingScore * 100 - outgoingScore;

    return { page: task, priority: score };
  });
}
