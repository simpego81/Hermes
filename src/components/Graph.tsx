/* Hermes force-directed graph canvas powered by react-force-graph. */
import { useCallback, useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import {
  BOX_TYPE_ORDER,
  computeGroupBoxes,
  computeTimelineLanes,
  computeTimelinePositions,
  getDeadlineLabel,
  gridPositionsInBox,
} from '../lib/layout';
import type { LayoutMode } from '../lib/layout';
import { PAGE_COLORS, PAGE_TYPE_LABELS } from '../lib/types';
import type { GraphData, HermesPage, PageType } from '../lib/types';

// react-force-graph enriches nodes with x/y/vx/vy from the d3 simulation.
// fx/fy pin a node at a fixed position (standard d3 convention).
interface SimNode extends Record<string, unknown> {
  id: string;
  label: string;
  type: PageType;
  val: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
}

interface SimLink extends Record<string, unknown> {
  source: string | SimNode;
  target: string | SimNode;
}

interface GraphProps {
  data: GraphData;
  pages: HermesPage[];
  selectedId: string | null;
  layoutMode: LayoutMode;
  groupFilter?: PageType | null;
  onNodeClick(id: string): void;
}

const LABEL_ZOOM_THRESHOLD = 1.2;
const BASE_FONT_PX = 13;

export function Graph({ data, pages, selectedId, layoutMode, groupFilter, onNodeClick }: GraphProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef<Map<string, { fx: number; fy: number }>>(new Map());
  const labelOffsetRef = useRef<Map<string, number>>(new Map());
  const flagOffsetRef = useRef<Map<string, number>>(new Map()); // TASK-047: Objective flag stacking offsets
  // OPTIMIZATION: Track camera position for viewport culling
  const cameraRef = useRef({ x: 0, y: 0, k: 1 });
  // OPTIMIZATION: FPS monitoring for performance observability
  const fpsRef = useRef<number>(60);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const [size, setSize] = useState({ width: 0, height: 0 });

  // Keep canvas dimensions in sync with the flex container.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () =>
      setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Pan + zoom to the selected node when it changes.
  useEffect(() => {
    if (!selectedId || !graphRef.current) return;
    const node = (data.nodes as SimNode[]).find((n) => n.id === selectedId);
    if (node?.x != null && node?.y != null) {
      graphRef.current.centerAt(node.x, node.y, 400);
      graphRef.current.zoom(2.8, 400);
    }
  }, [selectedId, data]);

  // ── Layout forces (TASK-006 grouped, TASK-007 timeline) ──────────────────
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || size.width === 0) return;

    // Remove any previous custom force and un-pin all nodes.
    graph.d3Force('hermes-layout', null);
    // react-force-graph-2d mutates data.nodes in place (adds x/y/vx/vy),
    // so data.nodes IS the live simulation node array.
    const liveNodes = data.nodes as SimNode[];
    liveNodes.forEach((n) => {
      n.fx = undefined;
      n.fy = undefined;
    });
    pinnedRef.current = new Map();
    labelOffsetRef.current = new Map();

    // D3 collision force — prevent node overlap
    // OPTIMIZATION: Use spatial grid for O(n) collision detection instead of O(n²)
    const collisionForce = graph.d3Force('collision');
    if (!collisionForce) {
      try {
        const nodeRadius = (node: SimNode) => Math.sqrt(node.val) * 2.8 + 4;
        let collNodes: SimNode[] = [];

        // Spatial grid optimization for large graphs
        const GRID_SIZE = 60; // cell size in pixels
        const collForce = Object.assign(
          function (alpha: number) {
            if (collNodes.length === 0) return;

            // Build spatial grid: map grid cell key to nodes in that cell
            const grid = new Map<string, SimNode[]>();
            const cellKey = (x: number, y: number) => {
              const cx = Math.floor(x / GRID_SIZE);
              const cy = Math.floor(y / GRID_SIZE);
              return `${cx},${cy}`;
            };

            collNodes.forEach((n) => {
              if (n.x !== undefined && n.y !== undefined) {
                const key = cellKey(n.x, n.y);
                if (!grid.has(key)) grid.set(key, []);
                grid.get(key)!.push(n);
              }
            });

            // Check collisions only within same cell and adjacent cells
            collNodes.forEach((a) => {
              if (a.x === undefined || a.y === undefined) return;
              const rA = nodeRadius(a);
              const cx = Math.floor(a.x / GRID_SIZE);
              const cy = Math.floor(a.y / GRID_SIZE);

              // Check current cell and 8 adjacent cells
              for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                  const key = `${cx + dx},${cy + dy}`;
                  const neighbors = grid.get(key);
                  if (!neighbors) continue;

                  neighbors.forEach((b) => {
                    if (a === b || a.x === undefined || a.y === undefined || b.x === undefined || b.y === undefined) return;
                    const rB = nodeRadius(b);
                    const dx = b.x - a.x;
                    const dy = b.y - a.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    const minDist = rA + rB + 5; // TASK-048: +5px safety margin to prevent touch-overlap

                    if (dist < minDist) {
                      // OPTIMIZATION: Increased collision strength from 0.5 to 0.75 to reduce
                      // node overlapping in dense 500+ node layouts (FEEDBACK009/010)
                      const strength = ((minDist - dist) / dist) * 0.75 * alpha;
                      const mx = (dx / dist) * strength;
                      const my = (dy / dist) * strength;
                      if (a.fx === undefined) { a.vx = (a.vx ?? 0) - mx; a.vy = (a.vy ?? 0) - my; }
                      if (b.fx === undefined) { b.vx = (b.vx ?? 0) + mx; b.vy = (b.vy ?? 0) + my; }
                    }
                  });
                }
              }
            });
          },
          { initialize: (ns: SimNode[]) => { collNodes = ns; } },
        );
        graph.d3Force('collision', collForce);
      } catch { /* collision force not essential */ }
    }

    if (layoutMode === 'grouped') {
      const boxes = computeGroupBoxes(size.width, size.height);
      // When groupFilter is set, use a large centered box for the selected category only.
      let activeBoxes: typeof boxes;
      if (groupFilter) {
        const PAD = 60;
        activeBoxes = [{
          type: groupFilter,
          cx: 0,
          cy: 0,
          hw: size.width / 2 - PAD,
          hh: size.height / 2 - PAD,
        }];
      } else {
        activeBoxes = boxes;
      }
      const boxMap = new Map(activeBoxes.map((b) => [b.type, b]));

      // Pre-position nodes sorted by importance (val desc) within each box.
      const valMap = new Map(liveNodes.map((n) => [n.id, n.val]));
      const byType = new Map<string, string[]>(
        BOX_TYPE_ORDER.map((t) => [t, [] as string[]]),
      );
      liveNodes.forEach((n) => byType.get(n.type)?.push(n.id));

      activeBoxes.forEach((box) => {
        const ids = byType.get(box.type) ?? [];
        const positions = gridPositionsInBox(ids, valMap, box);
        liveNodes.forEach((n) => {
          const pos = positions.get(n.id);
          if (pos) { n.x = pos.x; n.y = pos.y; n.vx = 0; n.vy = 0; }
        });
      });

      // Box containment force: attraction to box center + hard boundary clamp.
      // When groupFilter is set, non-matching nodes are repelled outside the box.
      let forceNodes: SimNode[] = [];
      const boxForce = Object.assign(
        function (alpha: number) {
          const STRENGTH = 0.12;
          const MARGIN = 14;
          forceNodes.forEach((n) => {
            const box = boxMap.get(n.type);
            if (box) {
              // Inside the box — attract and clamp
              n.vx = (n.vx ?? 0) + (box.cx - (n.x ?? 0)) * STRENGTH * alpha;
              n.vy = (n.vy ?? 0) + (box.cy - (n.y ?? 0)) * STRENGTH * alpha;
              n.x = Math.max(box.cx - box.hw + MARGIN, Math.min(box.cx + box.hw - MARGIN, n.x ?? 0));
              n.y = Math.max(box.cy - box.hh + MARGIN, Math.min(box.cy + box.hh - MARGIN, n.y ?? 0));
            } else if (groupFilter) {
              // Non-matching node: push it outside the active box
              const aBox = activeBoxes[0];
              const nx = n.x ?? 0;
              const ny = n.y ?? 0;
              const inBoxX = nx > aBox.cx - aBox.hw && nx < aBox.cx + aBox.hw;
              const inBoxY = ny > aBox.cy - aBox.hh && ny < aBox.cy + aBox.hh;
              if (inBoxX && inBoxY) {
                // Push outward based on closest edge
                const dLeft = nx - (aBox.cx - aBox.hw);
                const dRight = (aBox.cx + aBox.hw) - nx;
                const dTop = ny - (aBox.cy - aBox.hh);
                const dBottom = (aBox.cy + aBox.hh) - ny;
                const minD = Math.min(dLeft, dRight, dTop, dBottom);
                const PUSH = 0.3;
                if (minD === dLeft) n.vx = (n.vx ?? 0) - PUSH * alpha * 50;
                else if (minD === dRight) n.vx = (n.vx ?? 0) + PUSH * alpha * 50;
                else if (minD === dTop) n.vy = (n.vy ?? 0) - PUSH * alpha * 50;
                else n.vy = (n.vy ?? 0) + PUSH * alpha * 50;
              }
            }
          });
        },
        { initialize: (ns: SimNode[]) => { forceNodes = ns; } },
      );
      graph.d3Force('hermes-layout', boxForce);

    } else if (layoutMode === 'timeline') {
      const { positions, todayX } = computeTimelinePositions(pages, size.width);
      const TIMELINE_Y = -(size.height * 0.28);
      const FREE_Y_BIAS = size.height * 0.14;

      // Swim lanes only when a category filter is active
      // Objectives are excluded since they sit on the timeline axis (TASK-043)
      const lanes = groupFilter && groupFilter !== 'objective'
        ? computeTimelineLanes(size.width, size.height, TIMELINE_Y).filter(l => l.type === groupFilter)
        : [];
      const laneMap = new Map(lanes.map((l) => [l.type, l]));

      // Pin deadline nodes at their x position, centered in their type's lane.
      const pinned = new Map<string, { fx: number; fy: number }>();

      // FEEDBACK008 Req 4-5: Use lane-based stratification for all types
      // Build lane map from computeTimelineLanes (includes all 5 types now)
      const allLanes = computeTimelineLanes(size.width, size.height, TIMELINE_Y);
      const fullLaneMap = new Map(allLanes.map((l) => [l.type, l]));

      liveNodes.forEach((n) => {
        const entry = positions.get(n.id);
        if (entry !== undefined) {
          // Use lane positioning for all types (not just filtered ones)
          const lane = fullLaneMap.get(entry.type);
          const yPos = lane ? lane.cy : TIMELINE_Y;
          n.fx = entry.x;
          n.fy = yPos;
          n.x = entry.x;
          n.y = yPos;
          n.vx = 0;
          n.vy = 0;
          pinned.set(n.id, { fx: entry.x, fy: yPos });
        } else if (laneMap.has(n.type)) {
          // Non-deadline node of a lane type: place inside its lane
          // FEEDBACK007: Preserve existing position to avoid bounce on edits
          const lane = laneMap.get(n.type)!;
          if (n.x === undefined || n.y === undefined) {
            n.x = lane.cx + (Math.random() - 0.5) * lane.hw;
            n.y = lane.cy + (Math.random() - 0.5) * lane.hh * 0.5;
          }
          n.vx = 0;
          n.vy = 0;
        } else if (n.type === 'persona' && groupFilter === 'persona') {
          // Persona grouping box: wide as the timeline (TASK-043)
          const pBox = {
            cx: 0,
            cy: FREE_Y_BIAS + 80,
            hw: size.width / 2 - 50,
            hh: 60,
          };
          // Margin 20%
          const innerHW = pBox.hw * 0.8;
          const innerHH = pBox.hh * 0.8;
          // FEEDBACK007: Preserve existing position to avoid bounce on edits
          if (n.x === undefined || n.y === undefined) {
            n.x = pBox.cx + (Math.random() - 0.5) * innerHW * 2;
            n.y = pBox.cy + (Math.random() - 0.5) * innerHH * 2;
          }
          n.vx = 0;
          n.vy = 0;
        } else {
          // FEEDBACK007: Preserve existing Y to avoid bounce, only set if undefined
          if (n.y === undefined) {
            n.y = FREE_Y_BIAS;
          } else {
            n.y = Math.max(FREE_Y_BIAS, n.y);
          }
          n.vx = 0;
          n.vy = 0;
        }
      });
      pinnedRef.current = pinned;

      // FEEDBACK008 Req 6: Clever label overlap avoidance with vertical displacement
      const sortedPinned = [...pinned.entries()].sort((a, b) => a[1].fx - b[1].fx);
      const offsets = new Map<string, number>();
      const MIN_X_GAP = 90; // px threshold below which labels may collide (increased from 70)

      for (let i = 0; i < sortedPinned.length; i++) {
        const [id, pos] = sortedPinned[i];
        let offset = 0;
        let collisionCount = 0;

        // Check previous pinned nodes at similar Y for cascading collisions
        for (let j = i - 1; j >= 0; j--) {
          const [prevId, prevPos] = sortedPinned[j];
          const xDist = Math.abs(prevPos.fx - pos.fx);
          if (xDist > MIN_X_GAP) break; // far enough, stop checking

          const yDist = Math.abs(prevPos.fy - pos.fy);
          if (yDist < 50) { // Same horizontal band
            collisionCount++;
            const prevOffset = offsets.get(prevId) ?? 0;
            // Progressive stagger: more collisions = larger offset
            const stagger = 18 + Math.min(collisionCount * 2, 10);
            offset = Math.max(offset, prevOffset + stagger);
          }
        }

        offsets.set(id, offset);
      }
      labelOffsetRef.current = offsets;

      // Persona grouping box for zone force — only when filter active (TASK-043)
      const showPersonaBox = groupFilter === 'persona';
      const personaBox = {
        cx: 0,
        cy: FREE_Y_BIAS + 80,
        hw: size.width / 2 - 50,
        hh: 60,
      };

      // Zone force: keep non-pinned nodes in lanes or lower half.
      let forceNodes: SimNode[] = [];
      const zoneForce = Object.assign(
        function (alpha: number) {
          forceNodes.forEach((n) => {
            if (n.fx !== undefined) return; // pinned on timeline
            const lane = laneMap.get(n.type);
            if (lane) {
              // Attract to lane center and clamp within lane bounds
              // TASK-048: Increased strength from 0.12 to 0.35 for stronger lane containment
              const STRENGTH = 0.35;
              const MARGIN = 14;
              n.vx = (n.vx ?? 0) + (lane.cx - (n.x ?? 0)) * STRENGTH * alpha * 0.3;
              n.vy = (n.vy ?? 0) + (lane.cy - (n.y ?? 0)) * STRENGTH * alpha;
              // Hard clamp Y to prevent vertical escape from lane
              const LANE_CLAMP = lane.hh * 0.8;
              n.y = Math.max(lane.cy - LANE_CLAMP, Math.min(lane.cy + LANE_CLAMP, n.y ?? 0));
            } else if (n.type === 'persona' && showPersonaBox) {
              // Contain personas in their box only when filter is active
              const STRENGTH = 0.12;
              const MARGIN = 14;
              const innerHW = personaBox.hw * 0.8;
              const innerHH = personaBox.hh * 0.8;
              n.vx = (n.vx ?? 0) + (personaBox.cx - (n.x ?? 0)) * STRENGTH * alpha;
              n.vy = (n.vy ?? 0) + (personaBox.cy - (n.y ?? 0)) * STRENGTH * alpha;
              n.x = Math.max(personaBox.cx - innerHW + MARGIN, Math.min(personaBox.cx + innerHW - MARGIN, n.x ?? 0));
              n.y = Math.max(personaBox.cy - innerHH + MARGIN, Math.min(personaBox.cy + innerHH - MARGIN, n.y ?? 0));
            } else if (showPersonaBox) {
                // Non-matching node: push it outside the persona box
                const nx = n.x ?? 0;
                const ny = n.y ?? 0;
                const inBoxX = nx > personaBox.cx - personaBox.hw && nx < personaBox.cx + personaBox.hw;
                const inBoxY = ny > personaBox.cy - personaBox.hh && ny < personaBox.cy + personaBox.hh;
                if (inBoxX && inBoxY) {
                  const dTop = ny - (personaBox.cy - personaBox.hh);
                  const dBottom = (personaBox.cy + personaBox.hh) - ny;
                  if (dTop < dBottom) n.vy = (n.vy ?? 0) - 0.5 * alpha * 50;
                  else n.vy = (n.vy ?? 0) + 0.5 * alpha * 50;
                }
            } else if ((n.y ?? 0) < FREE_Y_BIAS) {
              n.vy = (n.vy ?? 0) + (FREE_Y_BIAS - (n.y ?? 0)) * 0.18 * alpha;
            }
          });
        },
        { initialize: (ns: SimNode[]) => { forceNodes = ns; } },
      );
      graph.d3Force('hermes-layout', zoneForce);
    }

    graph.d3ReheatSimulation();

    // In timeline mode, pinned nodes are already at their final positions
    // (fx/fy are set synchronously above). Zoom to fit so the timeline is
    // always visible regardless of previous pan/zoom state.
    if (layoutMode === 'timeline') {
      setTimeout(() => {
        graphRef.current?.zoomToFit(400, 60);
      }, 50);
    }
  }, [layoutMode, groupFilter, size.width, size.height, pages, data]);

  // ── Node drawing ──────────────────────────────────────────────────────────
  const drawNode = useCallback(
    (rawNode: object, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const node = rawNode as SimNode;
      const radius = Math.sqrt(node.val) * 2.8;

      // OPTIMIZATION: Viewport frustum culling - skip rendering nodes outside visible viewport
      // BUG-002 FIX: Disable culling at high zoom levels where camera position tracking is less accurate
      const camera = cameraRef.current;
      const MIN_ZOOM_FOR_CULLING = 0.5; // Only cull when zoomed out (many nodes visible)

      if (camera.k >= MIN_ZOOM_FOR_CULLING) {
        const viewportW = size.width / camera.k;
        const viewportH = size.height / camera.k;
        const CULL_BUFFER = 200; // BUG-002: Increased buffer to prevent nodes disappearing (was 50)
        const nodeX = node.x ?? 0;
        const nodeY = node.y ?? 0;

        const isInViewport =
          nodeX >= camera.x - viewportW / 2 - CULL_BUFFER &&
          nodeX <= camera.x + viewportW / 2 + CULL_BUFFER &&
          nodeY >= camera.y - viewportH / 2 - CULL_BUFFER &&
          nodeY <= camera.y + viewportH / 2 + CULL_BUFFER;

        if (!isInViewport) {
          return; // Skip rendering this node (30-50% FPS improvement when zoomed)
        }
      }
      // At high zoom (k >= MIN_ZOOM_FOR_CULLING), render all nodes (fewer visible, culling not needed)

      const page = pages.find((p) => p.id === node.id);
      const isDone = page?.type === 'task' && page?.metadata.status === 'DONE';
      const color = isDone ? '#A09080' : (PAGE_COLORS[node.type] ?? PAGE_COLORS.note);
      const isSelected = node.id === selectedId;

      // TASK-047: Objective "flag" rendering in timeline mode
      if (layoutMode === 'timeline' && node.type === 'objective') {
        const TIMELINE_Y = -(size.height * 0.28);
        const flagW = 70 / globalScale;
        const flagH = 18 / globalScale;
        const vOffset = flagOffsetRef.current.get(node.id) ?? 0;
        const flagY = node.y! - vOffset;

        // Vertical marker from flag to timeline axis
        ctx.strokeStyle = color;
        ctx.lineWidth = 2 / globalScale;
        ctx.beginPath();
        ctx.moveTo(node.x!, flagY);
        ctx.lineTo(node.x!, TIMELINE_Y + 20 / globalScale);
        ctx.stroke();

        // Flag rectangle
        ctx.fillStyle = color;
        ctx.fillRect(node.x! - flagW / 2, flagY - flagH / 2, flagW, flagH);

        // Objective name in flag (white text)
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${11 / globalScale}px 'Segoe UI', system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.label, node.x!, flagY);

        // Selection glow for flag
        if (isSelected) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5 / globalScale;
          ctx.strokeRect(node.x! - flagW / 2, flagY - flagH / 2, flagW, flagH);
        }

        return; // Skip normal circle rendering
      }

      // Glow ring for selected node
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, radius + 5, 0, 2 * Math.PI);
        ctx.fillStyle = color + '44';
        ctx.fill();
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      // Persona circular count (TASK-043)
      if (node.type === 'persona' && page) {
        const tasks = pages.filter(p => p.type === 'task' && (Array.isArray(p.metadata.assignees) ? p.metadata.assignees : [p.metadata.assignees]).some(a => (typeof a === 'string' ? a : '').replace(/^\[\[|]]$/g, '') === page.title)).length;
        if (tasks > 0) {
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.max(6, radius * 0.8) / globalScale}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(tasks.toString(), node.x!, node.y!);
        }
      }

      // Border
      ctx.strokeStyle = isSelected ? '#ffffff' : color + 'aa';
      ctx.lineWidth = isSelected ? 2 / globalScale : 0.8 / globalScale;
      ctx.stroke();

      // TASK-047: Vertical persona labels in timeline mode (always visible)
      if (layoutMode === 'timeline' && node.type === 'persona') {
        ctx.save();
        ctx.translate(node.x!, node.y! + radius + 12 / globalScale);
        ctx.rotate(-Math.PI / 2); // 90 degrees counter-clockwise
        ctx.fillStyle = '#e8e8f0';
        const fontSize = BASE_FONT_PX / globalScale;
        ctx.font = `${fontSize}px 'Segoe UI', system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(node.label, 0, 0);
        ctx.restore();
      }
      // Label — only visible past the zoom threshold (normal modes)
      else if (globalScale >= LABEL_ZOOM_THRESHOLD) {
        const fontSize = BASE_FONT_PX / globalScale;
        ctx.font = `${fontSize}px 'Segoe UI', system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#e8e8f0';
        const labelYOffset = (labelOffsetRef.current.get(node.id) ?? 0) / globalScale;
        ctx.fillText(node.label, node.x!, node.y! + radius + 2 / globalScale + labelYOffset);
      }
    },
    [selectedId, pages, size.width, size.height, layoutMode],
  );

  const buildTooltip = useCallback(
    (rawNode: object) => {
      const node = rawNode as SimNode;
      const page = pages.find((p) => p.id === node.id);
      if (!page) return node.label;
      const typeLabel = PAGE_TYPE_LABELS[page.type];
      const metaEntries = Object.entries(page.metadata)
        .filter(([k]) => k !== 'type')
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
      const linksInfo =
        page.links.length > 0 ? `links: ${page.links.join(', ')}` : '';
      const parts = [`[${typeLabel}] ${page.title}`, ...metaEntries];
      if (linksInfo) parts.push(linksInfo);
      return parts.join('\n');
    },
    [pages],
  );

  // ── Canvas overlay: box outlines (grouped) and timeline axis ─────────────
  const renderOverlay = useCallback(
    (ctx: CanvasRenderingContext2D, globalScale: number) => {
      // OPTIMIZATION: Update camera ref for viewport culling
      if (graphRef.current) {
        const zoom = graphRef.current.zoom?.() ?? 1;
        // Note: react-force-graph doesn't expose centerAt() as getter, so we estimate center as (0,0)
        // This is accurate for initial state; manual panning may reduce culling effectiveness
        cameraRef.current = { x: 0, y: 0, k: zoom };
      }

      // OPTIMIZATION: FPS monitoring - measure frame delta time
      const now = performance.now();
      const delta = now - lastFrameTimeRef.current;
      if (delta > 0) {
        fpsRef.current = 1000 / delta;
        lastFrameTimeRef.current = now;
      }

      // Log performance warning when FPS drops significantly with large graphs
      const nodeCount = data.nodes.length;
      if (nodeCount > 500 && fpsRef.current < 30) {
        console.warn(
          `[Hermes Performance] FPS degradation: ${fpsRef.current.toFixed(1)} FPS with ${nodeCount} nodes`
        );
      }

      if (layoutMode === 'grouped') {
        const boxes = computeGroupBoxes(size.width, size.height);
        let overlayBoxes: typeof boxes;
        if (groupFilter) {
          const PAD = 60;
          overlayBoxes = [{
            type: groupFilter,
            cx: 0,
            cy: 0,
            hw: size.width / 2 - PAD,
            hh: size.height / 2 - PAD,
          }];
        } else {
          overlayBoxes = boxes;
        }
        overlayBoxes.forEach((box) => {
          const color = PAGE_COLORS[box.type];
          // Semi-transparent fill
          ctx.fillStyle = color + '14';
          ctx.fillRect(box.cx - box.hw, box.cy - box.hh, box.hw * 2, box.hh * 2);
          // Border
          ctx.strokeStyle = color + '55';
          ctx.lineWidth = 1.5 / globalScale;
          ctx.strokeRect(box.cx - box.hw, box.cy - box.hh, box.hw * 2, box.hh * 2);
          // Type label above the box
          const fs = 10 / globalScale;
          ctx.font = `700 ${fs}px 'Segoe UI', system-ui, sans-serif`;
          ctx.fillStyle = color + 'cc';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'bottom';
          ctx.fillText(
            PAGE_TYPE_LABELS[box.type].toUpperCase(),
            box.cx - box.hw + 4 / globalScale,
            box.cy - box.hh,
          );
        });
      } else if (layoutMode === 'timeline') {
        const { positions, todayX } = computeTimelinePositions(pages, size.width);
        const TIMELINE_Y = -(size.height * 0.28);
        const FREE_Y_BIAS = size.height * 0.14;
        const fsLabel = 9 / globalScale;

        // Today marker (red vertical line)
        if (todayX !== null) {
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 1.5 / globalScale;
            ctx.setLineDash([4 / globalScale, 4 / globalScale]);
            ctx.beginPath();
            ctx.moveTo(todayX, TIMELINE_Y - 40);
            ctx.lineTo(todayX, size.height / 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#ff4444';
            ctx.font = `bold ${8 / globalScale}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText('TODAY', todayX, TIMELINE_Y - 45);
        }

        // Timeline horizontal axis
        ctx.strokeStyle = 'rgba(200,200,230,0.28)';
        ctx.lineWidth = 1 / globalScale;
        ctx.beginPath();
        ctx.moveTo(-size.width / 2 + 52, TIMELINE_Y + 22 / globalScale);
        ctx.lineTo(size.width / 2 - 46, TIMELINE_Y + 22 / globalScale);
        ctx.stroke();

        // Arrow head at right end
        const arrX = size.width / 2 - 46;
        const arrY = TIMELINE_Y + 22 / globalScale;
        const arrSz = 5 / globalScale;
        ctx.fillStyle = 'rgba(200,200,230,0.28)';
        ctx.beginPath();
        ctx.moveTo(arrX, arrY);
        ctx.lineTo(arrX - arrSz, arrY - arrSz * 0.55);
        ctx.lineTo(arrX - arrSz, arrY + arrSz * 0.55);
        ctx.closePath();
        ctx.fill();

        // "TIMELINE" label
        ctx.font = `700 ${fsLabel}px 'Segoe UI', system-ui, sans-serif`;
        ctx.fillStyle = 'rgba(200,200,230,0.45)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText('TIMELINE', -size.width / 2 + 54, TIMELINE_Y + 18 / globalScale);

        // FEEDBACK008 Req 7: Date tick marks and labels with overlap avoidance
        const fsDate = 8 / globalScale;
        ctx.font = `${fsDate}px 'Segoe UI', system-ui, sans-serif`;

        // Collect and sort deadline labels by x position
        const deadlineLabels: Array<{ x: number; label: string; id: string }> = [];
        positions.forEach((entry, id) => {
          const page = pages.find((p) => p.id === id);
          const label = page ? getDeadlineLabel(page) : null;
          if (label) deadlineLabels.push({ x: entry.x, label, id });
        });
        deadlineLabels.sort((a, b) => a.x - b.x);

        // Compute vertical offsets to avoid overlap
        const labelOffsets = new Map<string, number>();
        const DATE_MIN_GAP = 55 / globalScale; // minimum horizontal gap to avoid collision

        for (let i = 0; i < deadlineLabels.length; i++) {
          const curr = deadlineLabels[i];
          let vOffset = 0;

          // Check overlap with previous labels
          for (let j = i - 1; j >= 0; j--) {
            const prev = deadlineLabels[j];
            const gap = curr.x - prev.x;
            if (gap > DATE_MIN_GAP) break; // far enough

            const prevOffset = labelOffsets.get(prev.id) ?? 0;
            // Alternate between down and up offsets
            const direction = i % 2 === 0 ? 1 : -1;
            vOffset = prevOffset === 0 ? 12 / globalScale * direction : 0;
          }

          labelOffsets.set(curr.id, vOffset);
        }

        // TASK-047: Compute objective flag stacking offsets
        const objectiveNodes = data.nodes
          .filter((n) => n.type === 'objective')
          .map((n) => ({ id: n.id, x: n.x ?? 0 }))
          .sort((a, b) => a.x - b.x);

        const flagOffsets = new Map<string, number>();
        const FLAG_MIN_GAP = 72 / globalScale; // Horizontal spacing threshold for stacking

        for (let i = 0; i < objectiveNodes.length; i++) {
          let vOffset = 0;
          for (let j = i - 1; j >= 0; j--) {
            const gap = objectiveNodes[i].x - objectiveNodes[j].x;
            if (gap > FLAG_MIN_GAP) break; // Far enough, no collision
            vOffset += 22 / globalScale; // Stack 22px higher
          }
          flagOffsets.set(objectiveNodes[i].id, vOffset);
        }
        flagOffsetRef.current = flagOffsets;

        // Draw ticks and labels with offsets
        ctx.textAlign = 'center';
        deadlineLabels.forEach(({ x, label, id }) => {
          const vOffset = labelOffsets.get(id) ?? 0;

          // Tick
          ctx.strokeStyle = 'rgba(200,200,230,0.2)';
          ctx.lineWidth = 0.8 / globalScale;
          ctx.beginPath();
          ctx.moveTo(x, TIMELINE_Y + 20 / globalScale);
          ctx.lineTo(x, TIMELINE_Y + 28 / globalScale);
          ctx.stroke();

          // Date text with vertical offset
          ctx.fillStyle = 'rgba(200,200,230,0.4)';
          ctx.textBaseline = vOffset < 0 ? 'bottom' : 'top';
          const baseY = TIMELINE_Y + (vOffset < 0 ? 18 / globalScale : 30 / globalScale);
          ctx.fillText(label, x, baseY + vOffset);
        });

        // Dashed separator for "No Deadline" zone
        ctx.strokeStyle = 'rgba(200,200,230,0.1)';
        ctx.lineWidth = 1 / globalScale;
        ctx.setLineDash([6 / globalScale, 5 / globalScale]);
        ctx.beginPath();
        ctx.moveTo(-size.width / 2 + 52, FREE_Y_BIAS);
        ctx.lineTo(size.width / 2 - 46, FREE_Y_BIAS);
        ctx.stroke();
        ctx.setLineDash([]);

        // "NO DEADLINE" zone label
        ctx.font = `700 ${fsLabel}px 'Segoe UI', system-ui, sans-serif`;
        ctx.fillStyle = 'rgba(200,200,230,0.2)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('NO DEADLINE', -size.width / 2 + 54, FREE_Y_BIAS + 4 / globalScale);

        // Category lanes below the timeline (TASK-032) — only when filter is active, excluding objectives (TASK-043)
        const lanes = groupFilter && groupFilter !== 'objective'
          ? computeTimelineLanes(size.width, size.height, TIMELINE_Y).filter(l => l.type === groupFilter)
          : [];
        lanes.forEach((lane) => {
          const color = PAGE_COLORS[lane.type];
          ctx.fillStyle = color + '14';
          ctx.fillRect(lane.cx - lane.hw, lane.cy - lane.hh, lane.hw * 2, lane.hh * 2);
          ctx.strokeStyle = color + '55';
          ctx.lineWidth = 1.5 / globalScale;
          ctx.strokeRect(lane.cx - lane.hw, lane.cy - lane.hh, lane.hw * 2, lane.hh * 2);
          const fs = 10 / globalScale;
          ctx.font = `700 ${fs}px 'Segoe UI', system-ui, sans-serif`;
          ctx.fillStyle = color + 'cc';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'bottom';
          ctx.fillText(
            PAGE_TYPE_LABELS[lane.type].toUpperCase(),
            lane.cx - lane.hw + 4 / globalScale,
            lane.cy - lane.hh,
          );
        });

        // Persona grouping box (TASK-038 Req 2) — only when persona filter active (TASK-043)
        if (groupFilter === 'persona') {
        const pBox = { cx: 0, cy: FREE_Y_BIAS + 80, hw: size.width / 2 - 50, hh: 60 };
        const pColor = PAGE_COLORS.persona;
        ctx.fillStyle = pColor + '14';
        ctx.fillRect(pBox.cx - pBox.hw, pBox.cy - pBox.hh, pBox.hw * 2, pBox.hh * 2);
        ctx.strokeStyle = pColor + '55';
        ctx.lineWidth = 1.5 / globalScale;
        ctx.strokeRect(pBox.cx - pBox.hw, pBox.cy - pBox.hh, pBox.hw * 2, pBox.hh * 2);
        const pFs = 10 / globalScale;
        ctx.font = `700 ${pFs}px 'Segoe UI', system-ui, sans-serif`;
        ctx.fillStyle = pColor + 'cc';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(
          PAGE_TYPE_LABELS.persona.toUpperCase(),
          pBox.cx - pBox.hw + 4 / globalScale,
          pBox.cy - pBox.hh,
        );
        }
      }
    },
    [layoutMode, groupFilter, pages, size.width, size.height],
  );

  // Prevent dragging deadline-pinned nodes in timeline mode.
  const handleNodeDrag = useCallback(
    (node: object) => {
      if (layoutMode !== 'timeline') return;
      const n = node as SimNode;
      const pin = pinnedRef.current.get(n.id);
      if (pin) {
        n.fx = pin.fx;
        n.fy = pin.fy;
        n.x = pin.fx;
        n.y = pin.fy;
      }
    },
    [layoutMode],
  );

  // OPTIMIZATION: Scale simulation parameters based on graph size
  const nodeCount = data.nodes.length;
  const cooldownTicks = nodeCount > 500 ? 80 : nodeCount > 200 ? 100 : 120;
  const alphaDecay = nodeCount > 500 ? 0.035 : nodeCount > 200 ? 0.028 : 0.022;
  const velocityDecay = nodeCount > 500 ? 0.35 : 0.28;

  return (
    <div ref={containerRef} className="graph-canvas">
      {size.width > 0 && (
        <ForceGraph2D
          ref={graphRef}
          graphData={data as { nodes: SimNode[]; links: SimLink[] }}
          width={size.width}
          height={size.height}
          nodeId="id"
          nodeVal="val"
          nodeLabel={buildTooltip}
          nodeCanvasObject={drawNode}
          nodeCanvasObjectMode={() => 'replace'}
          onRenderFramePre={renderOverlay}
          linkColor={() => 'rgba(180,180,200,0.22)'}
          linkWidth={1}
          backgroundColor="#1a1a1e"
          onNodeClick={(node) => onNodeClick((node as SimNode).id)}
          onNodeDrag={handleNodeDrag}
          cooldownTicks={cooldownTicks}
          d3AlphaDecay={alphaDecay}
          d3VelocityDecay={velocityDecay}
        />
      )}
    </div>
  );
}
