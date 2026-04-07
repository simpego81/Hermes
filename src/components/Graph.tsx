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

    // D3 collision force — prevent node overlap (TASK-043)
    const collisionForce = graph.d3Force('collision');
    if (!collisionForce) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d3 = (graph as any).d3Force;
      // Access forceCollide through the graph's internal d3
      try {
        // react-force-graph exposes d3Force(name, force) to set forces.
        // We need to create a collision force manually.
        const nodeRadius = (node: SimNode) => Math.sqrt(node.val) * 2.8 + 4;
        let collNodes: SimNode[] = [];
        const collForce = Object.assign(
          function (alpha: number) {
            for (let i = 0; i < collNodes.length; i++) {
              for (let j = i + 1; j < collNodes.length; j++) {
                const a = collNodes[i];
                const b = collNodes[j];
                const dx = (b.x ?? 0) - (a.x ?? 0);
                const dy = (b.y ?? 0) - (a.y ?? 0);
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const minDist = nodeRadius(a) + nodeRadius(b);
                if (dist < minDist) {
                  const strength = ((minDist - dist) / dist) * 0.5 * alpha;
                  const mx = dx * strength;
                  const my = dy * strength;
                  if (a.fx === undefined) { a.vx = (a.vx ?? 0) - mx; a.vy = (a.vy ?? 0) - my; }
                  if (b.fx === undefined) { b.vx = (b.vx ?? 0) + mx; b.vy = (b.vy ?? 0) + my; }
                }
              }
            }
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
      const txX = computeTimelinePositions(pages, size.width);
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
      liveNodes.forEach((n) => {
        const entry = txX.get(n.id);
        if (entry !== undefined) {
          const lane = laneMap.get(entry.type);
          // Objectives sit on the axis; tasks sit below. Lanes override if active.
          const defaultY = entry.type === 'objective' ? TIMELINE_Y : TIMELINE_Y + 70;
          const yPos = lane ? lane.cy : defaultY;
          n.fx = entry.x;
          n.fy = yPos;
          n.x = entry.x;
          n.y = yPos;
          n.vx = 0;
          n.vy = 0;
          pinned.set(n.id, { fx: entry.x, fy: yPos });
        } else if (laneMap.has(n.type)) {
          // Non-deadline node of a lane type: place inside its lane
          const lane = laneMap.get(n.type)!;
          n.x = lane.cx + (Math.random() - 0.5) * lane.hw;
          n.y = lane.cy + (Math.random() - 0.5) * lane.hh * 0.5;
          n.vx = 0;
          n.vy = 0;
        } else if (n.type === 'persona' && groupFilter === 'persona') {
          // Persona grouping box: only when persona filter is active (TASK-043)
          const pBox = {
            cx: size.width / 4,
            cy: FREE_Y_BIAS + 80,
            hw: size.width / 5,
            hh: 60,
          };
          n.x = pBox.cx + (Math.random() - 0.5) * pBox.hw;
          n.y = pBox.cy + (Math.random() - 0.5) * pBox.hh * 0.5;
          n.vx = 0;
          n.vy = 0;
        } else {
          n.y = Math.max(FREE_Y_BIAS, n.y ?? FREE_Y_BIAS);
          n.vx = 0;
          n.vy = 0;
        }
      });
      pinnedRef.current = pinned;

      // Compute label offsets to avoid text collisions (TASK-038 Req 1)
      const sortedPinned = [...pinned.entries()].sort((a, b) => a[1].fx - b[1].fx);
      const offsets = new Map<string, number>();
      const MIN_X_GAP = 70; // px threshold below which labels may collide
      for (let i = 0; i < sortedPinned.length; i++) {
        const [id, pos] = sortedPinned[i];
        let offset = 0;
        // Check previous pinned nodes at similar Y
        for (let j = i - 1; j >= 0; j--) {
          const [prevId, prevPos] = sortedPinned[j];
          if (Math.abs(prevPos.fx - pos.fx) > MIN_X_GAP) break;
          if (Math.abs(prevPos.fy - pos.fy) < 40) {
            // Same row — stagger label downward
            offset = (offsets.get(prevId) ?? 0) + 16;
          }
        }
        offsets.set(id, offset);
      }
      labelOffsetRef.current = offsets;

      // Persona grouping box for zone force — only when filter active (TASK-043)
      const showPersonaBox = groupFilter === 'persona';
      const personaBox = {
        cx: size.width / 4,
        cy: FREE_Y_BIAS + 80,
        hw: size.width / 5,
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
              const STRENGTH = 0.12;
              const MARGIN = 14;
              n.vx = (n.vx ?? 0) + (lane.cx - (n.x ?? 0)) * STRENGTH * alpha * 0.3;
              n.vy = (n.vy ?? 0) + (lane.cy - (n.y ?? 0)) * STRENGTH * alpha;
              n.y = Math.max(lane.cy - lane.hh + MARGIN, Math.min(lane.cy + lane.hh - MARGIN, n.y ?? 0));
            } else if (n.type === 'persona' && showPersonaBox) {
              // Contain personas in their box only when filter is active
              const STRENGTH = 0.12;
              const MARGIN = 14;
              n.vx = (n.vx ?? 0) + (personaBox.cx - (n.x ?? 0)) * STRENGTH * alpha;
              n.vy = (n.vy ?? 0) + (personaBox.cy - (n.y ?? 0)) * STRENGTH * alpha;
              n.x = Math.max(personaBox.cx - personaBox.hw + MARGIN, Math.min(personaBox.cx + personaBox.hw - MARGIN, n.x ?? 0));
              n.y = Math.max(personaBox.cy - personaBox.hh + MARGIN, Math.min(personaBox.cy + personaBox.hh - MARGIN, n.y ?? 0));
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
  }, [layoutMode, groupFilter, size.width, size.height, pages, data]);

  // ── Node drawing ──────────────────────────────────────────────────────────
  const drawNode = useCallback(
    (rawNode: object, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const node = rawNode as SimNode;
      const radius = Math.sqrt(node.val) * 2.8;
      const page = pages.find((p) => p.id === node.id);
      const isDone = page?.type === 'task' && page?.metadata.status === 'DONE';
      const color = isDone ? '#A09080' : (PAGE_COLORS[node.type] ?? PAGE_COLORS.note);
      const isSelected = node.id === selectedId;

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

      // Border
      ctx.strokeStyle = isSelected ? '#ffffff' : color + 'aa';
      ctx.lineWidth = isSelected ? 2 / globalScale : 0.8 / globalScale;
      ctx.stroke();

      // Label — only visible past the zoom threshold
      if (globalScale >= LABEL_ZOOM_THRESHOLD) {
        const fontSize = BASE_FONT_PX / globalScale;
        ctx.font = `${fontSize}px 'Segoe UI', system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#e8e8f0';
        const labelYOffset = (labelOffsetRef.current.get(node.id) ?? 0) / globalScale;
        ctx.fillText(node.label, node.x!, node.y! + radius + 2 / globalScale + labelYOffset);
      }
    },
    [selectedId],
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
        const txX = computeTimelinePositions(pages, size.width);
        const TIMELINE_Y = -(size.height * 0.28);
        const FREE_Y_BIAS = size.height * 0.14;
        const fsLabel = 9 / globalScale;

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

        // Date tick marks and labels for each deadline node
        const fsDate = 8 / globalScale;
        ctx.font = `${fsDate}px 'Segoe UI', system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        txX.forEach((entry, id) => {
          const page = pages.find((p) => p.id === id);
          const label = page ? getDeadlineLabel(page) : null;
          if (!label) return;
          // Tick
          ctx.strokeStyle = 'rgba(200,200,230,0.2)';
          ctx.lineWidth = 0.8 / globalScale;
          ctx.beginPath();
          ctx.moveTo(entry.x, TIMELINE_Y + 20 / globalScale);
          ctx.lineTo(entry.x, TIMELINE_Y + 28 / globalScale);
          ctx.stroke();
          // Date text
          ctx.fillStyle = 'rgba(200,200,230,0.4)';
          ctx.fillText(label, entry.x, TIMELINE_Y + 30 / globalScale);
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
        const pBox = { cx: size.width / 4, cy: FREE_Y_BIAS + 80, hw: size.width / 5, hh: 60 };
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
          cooldownTicks={120}
          d3AlphaDecay={0.022}
          d3VelocityDecay={0.28}
        />
      )}
    </div>
  );
}
