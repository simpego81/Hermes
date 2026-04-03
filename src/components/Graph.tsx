/* Hermes force-directed graph canvas powered by react-force-graph. */
import { useCallback, useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import {
  BOX_TYPE_ORDER,
  computeGroupBoxes,
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
  onNodeClick(id: string): void;
}

const LABEL_ZOOM_THRESHOLD = 1.2;
const BASE_FONT_PX = 13;

export function Graph({ data, pages, selectedId, layoutMode, onNodeClick }: GraphProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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

    if (layoutMode === 'grouped') {
      const boxes = computeGroupBoxes(size.width, size.height);
      const boxMap = new Map(boxes.map((b) => [b.type, b]));

      // Pre-position nodes sorted by importance (val desc) within each box.
      const valMap = new Map(liveNodes.map((n) => [n.id, n.val]));
      const byType = new Map<string, string[]>(
        BOX_TYPE_ORDER.map((t) => [t, [] as string[]]),
      );
      liveNodes.forEach((n) => byType.get(n.type)?.push(n.id));

      boxes.forEach((box) => {
        const ids = byType.get(box.type) ?? [];
        const positions = gridPositionsInBox(ids, valMap, box);
        liveNodes.forEach((n) => {
          const pos = positions.get(n.id);
          if (pos) { n.x = pos.x; n.y = pos.y; n.vx = 0; n.vy = 0; }
        });
      });

      // Box containment force: attraction to box center + hard boundary clamp.
      let forceNodes: SimNode[] = [];
      const boxForce = Object.assign(
        function (alpha: number) {
          const STRENGTH = 0.12;
          const MARGIN = 14;
          forceNodes.forEach((n) => {
            const box = boxMap.get(n.type);
            if (!box) return;
            n.vx = (n.vx ?? 0) + (box.cx - (n.x ?? 0)) * STRENGTH * alpha;
            n.vy = (n.vy ?? 0) + (box.cy - (n.y ?? 0)) * STRENGTH * alpha;
            n.x = Math.max(box.cx - box.hw + MARGIN, Math.min(box.cx + box.hw - MARGIN, n.x ?? 0));
            n.y = Math.max(box.cy - box.hh + MARGIN, Math.min(box.cy + box.hh - MARGIN, n.y ?? 0));
          });
        },
        { initialize: (ns: SimNode[]) => { forceNodes = ns; } },
      );
      graph.d3Force('hermes-layout', boxForce);

    } else if (layoutMode === 'timeline') {
      const txX = computeTimelinePositions(pages, size.width);
      const TIMELINE_Y = -(size.height * 0.28);
      const FREE_Y_BIAS = size.height * 0.14;

      // Pin deadline nodes along the timeline axis; push free nodes down.
      liveNodes.forEach((n) => {
        const x = txX.get(n.id);
        if (x !== undefined) {
          n.fx = x;
          n.fy = TIMELINE_Y;
          n.x = x;
          n.y = TIMELINE_Y;
          n.vx = 0;
          n.vy = 0;
        } else {
          n.y = Math.max(FREE_Y_BIAS, n.y ?? FREE_Y_BIAS);
          n.vx = 0;
          n.vy = 0;
        }
      });

      // Zone force: keep non-pinned nodes in the lower half.
      let forceNodes: SimNode[] = [];
      const zoneForce = Object.assign(
        function (alpha: number) {
          forceNodes.forEach((n) => {
            if (n.fx !== undefined) return; // pinned
            if ((n.y ?? 0) < FREE_Y_BIAS) {
              n.vy = (n.vy ?? 0) + (FREE_Y_BIAS - (n.y ?? 0)) * 0.18 * alpha;
            }
          });
        },
        { initialize: (ns: SimNode[]) => { forceNodes = ns; } },
      );
      graph.d3Force('hermes-layout', zoneForce);
    }

    graph.d3ReheatSimulation();
  }, [layoutMode, size.width, size.height, pages, data]);

  // ── Node drawing ──────────────────────────────────────────────────────────
  const drawNode = useCallback(
    (rawNode: object, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const node = rawNode as SimNode;
      const radius = Math.sqrt(node.val) * 2.8;
      const color =
        PAGE_COLORS[node.type] ?? PAGE_COLORS.note;
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
        ctx.fillText(node.label, node.x!, node.y! + radius + 2 / globalScale);
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
        boxes.forEach((box) => {
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
        txX.forEach((x, id) => {
          const page = pages.find((p) => p.id === id);
          const label = page ? getDeadlineLabel(page) : null;
          if (!label) return;
          // Tick
          ctx.strokeStyle = 'rgba(200,200,230,0.2)';
          ctx.lineWidth = 0.8 / globalScale;
          ctx.beginPath();
          ctx.moveTo(x, TIMELINE_Y + 20 / globalScale);
          ctx.lineTo(x, TIMELINE_Y + 28 / globalScale);
          ctx.stroke();
          // Date text
          ctx.fillStyle = 'rgba(200,200,230,0.4)';
          ctx.fillText(label, x, TIMELINE_Y + 30 / globalScale);
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
      }
    },
    [layoutMode, pages, size.width, size.height],
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
          cooldownTicks={120}
          d3AlphaDecay={0.022}
          d3VelocityDecay={0.28}
        />
      )}
    </div>
  );
}
