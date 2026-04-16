"use client";

import { useCallback, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  Panel,
  Position,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";

import type { CampaignNode, CampaignEdge, NodeMetrics, OptimizationHistoryEntry } from "@/lib/queries/campaign-detail-queries";
import { CampaignNodeDrawer } from "./campaign-node-drawer";

// ---------------------------------------------------------------------------
// Icons per kind (emoji + color)
// ---------------------------------------------------------------------------

const KIND_CONFIG: Record<
  CampaignNode["kind"],
  { icon: string; color: string; label: string }
> = {
  campaign: { icon: "🚀", color: "from-blue-500 to-cyan-500", label: "Campaign" },
  ad: { icon: "📣", color: "from-pink-500 to-rose-500", label: "Ad Creative" },
  landing_variant: { icon: "🖥️", color: "from-violet-500 to-purple-500", label: "Landing Page" },
  email_step: { icon: "✉️", color: "from-amber-500 to-orange-500", label: "Email" },
  sms_step: { icon: "💬", color: "from-emerald-500 to-teal-500", label: "SMS" },
  ai_agent: { icon: "🤖", color: "from-cyan-500 to-blue-500", label: "AI Agent" },
  pipeline_stage: { icon: "🎯", color: "from-slate-500 to-slate-600", label: "Pipeline Stage" },
  booking: { icon: "📅", color: "from-green-500 to-emerald-500", label: "Booking" },
};

const HEALTH_RING: Record<string, string> = {
  healthy: "ring-emerald-400/60 shadow-emerald-500/20",
  warning: "ring-amber-400/60 shadow-amber-500/20",
  critical: "ring-red-400/60 shadow-red-500/20",
  inactive: "ring-slate-700/60 shadow-slate-900/20",
};

// ---------------------------------------------------------------------------
// Custom React Flow node component
// ---------------------------------------------------------------------------

interface MMNodeData {
  node: CampaignNode;
}

function MMNode({ data }: NodeProps<MMNodeData>) {
  const n = data.node;
  const cfg = KIND_CONFIG[n.kind];
  const m: NodeMetrics | undefined = n.metrics;
  const health = m?.health ?? "inactive";

  const isRoot = n.kind === "campaign";

  return (
    <div
      className={`rounded-2xl border-2 bg-slate-900 text-white shadow-xl ring-4 ${HEALTH_RING[health]} ${
        isRoot ? "border-blue-500 w-80" : "border-slate-700 hover:border-slate-500 w-64"
      } transition-all cursor-pointer`}
    >
      {/* Header */}
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-t-2xl bg-gradient-to-r ${cfg.color}`}
      >
        <span className="text-lg">{cfg.icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-white/90">
          {cfg.label}
        </span>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <h4 className={`font-bold ${isRoot ? "text-base" : "text-sm"} leading-snug text-white line-clamp-2`}>
          {n.label}
        </h4>
        {n.subLabel && (
          <p className="text-xs text-slate-400 mt-1 truncate">{n.subLabel}</p>
        )}

        {/* Metrics */}
        {m && (
          <div className="mt-3 grid grid-cols-3 gap-2 pt-3 border-t border-slate-800">
            {m.primary_value && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">
                  {m.primary_label}
                </div>
                <div className="text-sm font-semibold text-white">{m.primary_value}</div>
              </div>
            )}
            {m.secondary_value && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">
                  {m.secondary_label}
                </div>
                <div className="text-sm font-semibold text-white">{m.secondary_value}</div>
              </div>
            )}
            {m.tertiary_value && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">
                  {m.tertiary_label}
                </div>
                <div className="text-sm font-semibold text-white">{m.tertiary_value}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const nodeTypes = { mm: MMNode };

// ---------------------------------------------------------------------------
// Layout: hub-and-spoke around campaign root
// ---------------------------------------------------------------------------

function computeLayout(
  campaignNodes: CampaignNode[]
): { rfNodes: Node<MMNodeData>[]; rfEdges: Edge[] } {
  const root = campaignNodes.find((n) => n.kind === "campaign");
  if (!root) return { rfNodes: [], rfEdges: [] };

  // Group children by kind
  const children = campaignNodes.filter((n) => n.id !== root.id);
  const groups: Record<string, CampaignNode[]> = {};
  for (const c of children) {
    if (!groups[c.kind]) groups[c.kind] = [];
    groups[c.kind].push(c);
  }
  // Stable order inside each group
  for (const k of Object.keys(groups)) {
    groups[k].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  // Arrange groups in a rough funnel-flow order left-to-right
  const groupOrder: CampaignNode["kind"][] = [
    "ad",
    "landing_variant",
    "email_step",
    "sms_step",
    "ai_agent",
    "pipeline_stage",
    "booking",
  ];

  const rfNodes: Node<MMNodeData>[] = [];

  // Root at origin
  rfNodes.push({
    id: root.id,
    type: "mm",
    position: { x: 0, y: 0 },
    data: { node: root },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  });

  // Each group gets a vertical column to the right of root, spaced by column index
  const COL_WIDTH = 360;
  const ROW_HEIGHT = 220;
  let colIndex = 1;

  for (const kind of groupOrder) {
    const list = groups[kind];
    if (!list || list.length === 0) continue;

    const x = colIndex * COL_WIDTH;
    const totalHeight = (list.length - 1) * ROW_HEIGHT;
    const startY = -totalHeight / 2;

    list.forEach((node, i) => {
      rfNodes.push({
        id: node.id,
        type: "mm",
        position: { x, y: startY + i * ROW_HEIGHT },
        data: { node },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });
    });

    colIndex++;
  }

  // Simple edges from root → every child, colored by target kind's gradient
  const rfEdges: Edge[] = children.map((c) => {
    const cfg = KIND_CONFIG[c.kind];
    const volume = 1; // could use actual volume, for now visual only
    return {
      id: `e:${root.id}->${c.id}`,
      source: root.id,
      target: c.id,
      type: "smoothstep",
      animated: (c.metrics?.health ?? "inactive") === "healthy",
      style: {
        stroke: "#475569",
        strokeWidth: 2,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#475569" },
      label: cfg.label,
      labelStyle: { fill: "#94a3b8", fontSize: 11, fontWeight: 500 },
      labelBgStyle: { fill: "#0f172a" },
      labelBgPadding: [4, 4],
      labelBgBorderRadius: 4,
    };
  });

  return { rfNodes, rfEdges };
}

// ---------------------------------------------------------------------------
// Main mind map
// ---------------------------------------------------------------------------

export function CampaignMindMap({
  nodes,
  edges,
  historyByNode,
  landingSlug,
}: {
  nodes: CampaignNode[];
  edges: CampaignEdge[];
  historyByNode: Record<string, OptimizationHistoryEntry[]>;
  landingSlug: string | null;
}) {
  void edges; // we compute edges from the layout for now
  const [selectedNode, setSelectedNode] = useState<CampaignNode | null>(null);

  const { rfNodes, rfEdges } = useMemo(() => computeLayout(nodes), [nodes]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_ev, rfNode) => {
      const clicked = (rfNode.data as MMNodeData | undefined)?.node;
      if (clicked) setSelectedNode(clicked);
    },
    []
  );

  return (
    <>
      <div className="h-[calc(100vh-240px)] min-h-[600px] rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#1e293b" gap={24} />
          <Controls
            position="bottom-left"
            showInteractive={false}
            className="!bg-slate-800 !border-slate-700"
          />
          <MiniMap
            nodeColor={(n) => {
              const kind = (n.data as MMNodeData)?.node?.kind ?? "campaign";
              const cfgKey = KIND_CONFIG[kind as CampaignNode["kind"]];
              // Approximate solid colors
              const colorMap: Record<string, string> = {
                campaign: "#3b82f6",
                ad: "#ec4899",
                landing_variant: "#8b5cf6",
                email_step: "#f59e0b",
                sms_step: "#10b981",
                ai_agent: "#06b6d4",
                pipeline_stage: "#64748b",
                booking: "#22c55e",
              };
              return colorMap[kind] ?? "#64748b";
            }}
            className="!bg-slate-900 !border-slate-700"
            zoomable
            pannable
          />
          <Panel position="top-right" className="flex gap-2">
            <Legend />
          </Panel>
        </ReactFlow>
      </div>

      <CampaignNodeDrawer
        node={selectedNode}
        history={selectedNode ? historyByNode[selectedNode.id] ?? [] : []}
        landingSlug={landingSlug}
        onClose={() => setSelectedNode(null)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------

function Legend() {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/90 backdrop-blur-sm p-3 text-xs">
      <p className="font-semibold text-slate-200 mb-2">Health</p>
      <div className="flex items-center gap-1.5 text-slate-300 mb-1">
        <span className="w-3 h-3 rounded-full bg-emerald-400/70 ring-2 ring-emerald-400/30" />
        Healthy
      </div>
      <div className="flex items-center gap-1.5 text-slate-300 mb-1">
        <span className="w-3 h-3 rounded-full bg-amber-400/70 ring-2 ring-amber-400/30" />
        Warning
      </div>
      <div className="flex items-center gap-1.5 text-slate-300 mb-1">
        <span className="w-3 h-3 rounded-full bg-red-400/70 ring-2 ring-red-400/30" />
        Critical
      </div>
      <div className="flex items-center gap-1.5 text-slate-300">
        <span className="w-3 h-3 rounded-full bg-slate-500/70 ring-2 ring-slate-500/30" />
        No data yet
      </div>
    </div>
  );
}
