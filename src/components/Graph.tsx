/* Hermes force-directed graph canvas powered by react-force-graph. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ForceGraph2D } from 'react-force-graph';
import { PAGE_COLORS } from '../lib/types';
import type { GraphData, PageType } from '../lib/types';

// react-force-graph enriches nodes with x/y coords via the simulation.
interface SimNode extends Record<string, unknown> {
  id: string;
  label: string;
  type: PageType;
  val: number;
  x?: number;
  y?: number;
}

interface SimLink extends Record<string, unknown> {
  source: string | SimNode;
  target: string | SimNode;
}

interface GraphProps {
  data: GraphData;
  selectedId: string | null;
  onNodeClick(id: string): void;
}

const LABEL_ZOOM_THRESHOLD = 1.2;
const BASE_FONT_PX = 13;

export function Graph({ data, selectedId, onNodeClick }: GraphProps) {
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
          nodeLabel="label"
          nodeCanvasObject={drawNode}
          nodeCanvasObjectMode={() => 'replace'}
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
