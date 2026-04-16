"use client";

import { useState } from "react";
import { Network, List } from "lucide-react";
import { CampaignMindMap } from "./campaign-mind-map";
import type { CampaignNode, CampaignEdge, OptimizationHistoryEntry } from "@/lib/queries/campaign-detail-queries";

type View = "mindmap" | "list";

export function CampaignCommandCenter({
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
  const [view, setView] = useState<View>("mindmap");

  return (
    <div className="space-y-3">
      {/* View switcher */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setView("mindmap")}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            view === "mindmap"
              ? "bg-blue-500/15 border border-blue-500/30 text-blue-400"
              : "border border-slate-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Network className="w-4 h-4" />
          Mind map
        </button>
        <button
          onClick={() => setView("list")}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            view === "list"
              ? "bg-blue-500/15 border border-blue-500/30 text-blue-400"
              : "border border-slate-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          <List className="w-4 h-4" />
          List view
        </button>
        <p className="ml-3 text-xs text-slate-500">
          {nodes.length} node{nodes.length === 1 ? "" : "s"} · click any node to view content, metrics, and SOPHIA changes
        </p>
      </div>

      {view === "mindmap" ? (
        <CampaignMindMap
          nodes={nodes}
          edges={edges}
          historyByNode={historyByNode}
          landingSlug={landingSlug}
        />
      ) : (
        <ListView
          nodes={nodes}
          historyByNode={historyByNode}
          landingSlug={landingSlug}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fallback list view — grouped by node kind
// ---------------------------------------------------------------------------

import { CampaignNodeDrawer } from "./campaign-node-drawer";

function ListView({
  nodes,
  historyByNode,
  landingSlug,
}: {
  nodes: CampaignNode[];
  historyByNode: Record<string, OptimizationHistoryEntry[]>;
  landingSlug: string | null;
}) {
  const [selected, setSelected] = useState<CampaignNode | null>(null);

  const groups: Record<string, CampaignNode[]> = {};
  for (const n of nodes) {
    if (!groups[n.kind]) groups[n.kind] = [];
    groups[n.kind].push(n);
  }

  const kindLabels: Record<string, string> = {
    campaign: "Campaign",
    ad: "Ad Creatives",
    landing_variant: "Landing Page Variants",
    email_step: "Email Sequence",
    sms_step: "SMS Sequence",
    ai_agent: "AI Sales Agent",
    pipeline_stage: "Pipeline Stages",
    booking: "Booking & Checkout",
  };

  const order: (keyof typeof kindLabels)[] = [
    "campaign",
    "ad",
    "landing_variant",
    "email_step",
    "sms_step",
    "ai_agent",
    "pipeline_stage",
    "booking",
  ];

  return (
    <>
      <div className="space-y-6">
        {order.map((kind) => {
          const list = groups[kind];
          if (!list || list.length === 0) return null;
          return (
            <div key={kind}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
                {kindLabels[kind]}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {list.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => setSelected(n)}
                    className="text-left rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-slate-700 hover:bg-slate-900/80 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white line-clamp-1">
                          {n.label}
                        </p>
                        {n.subLabel && (
                          <p className="text-xs text-slate-500 mt-0.5 truncate">
                            {n.subLabel}
                          </p>
                        )}
                      </div>
                      <span
                        className={`shrink-0 w-2.5 h-2.5 rounded-full ${
                          n.metrics?.health === "healthy"
                            ? "bg-emerald-400"
                            : n.metrics?.health === "warning"
                            ? "bg-amber-400"
                            : n.metrics?.health === "critical"
                            ? "bg-red-400"
                            : "bg-slate-600"
                        }`}
                      />
                    </div>
                    {n.metrics && (
                      <div className="mt-3 flex gap-4 text-xs">
                        {n.metrics.primary_value && (
                          <span className="text-slate-300">
                            <span className="text-slate-500">
                              {n.metrics.primary_label}:
                            </span>{" "}
                            {n.metrics.primary_value}
                          </span>
                        )}
                        {n.metrics.secondary_value && (
                          <span className="text-slate-300">
                            <span className="text-slate-500">
                              {n.metrics.secondary_label}:
                            </span>{" "}
                            {n.metrics.secondary_value}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <CampaignNodeDrawer
        node={selected}
        history={selected ? historyByNode[selected.id] ?? [] : []}
        landingSlug={landingSlug}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
