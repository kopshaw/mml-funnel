"use client";

import { useState, useEffect } from "react";
import {
  X, ExternalLink, TrendingUp, TrendingDown, Clock,
  CheckCircle, AlertCircle, Bot, FileText, BarChart3, History,
} from "lucide-react";
import type { CampaignNode, OptimizationHistoryEntry } from "@/lib/queries/campaign-detail-queries";

// ---------------------------------------------------------------------------
// Drawer root
// ---------------------------------------------------------------------------

export function CampaignNodeDrawer({
  node,
  history,
  landingSlug,
  onClose,
}: {
  node: CampaignNode | null;
  history: OptimizationHistoryEntry[];
  landingSlug: string | null;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"content" | "metrics" | "history">("content");

  // Reset tab when node changes
  useEffect(() => {
    setActiveTab("content");
  }, [node?.id]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!node) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <aside className="fixed right-0 top-0 bottom-0 z-50 w-full sm:max-w-xl lg:max-w-2xl bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-6 border-b border-slate-800">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-1">
              {prettyKind(node.kind)}
            </p>
            <h2 className="text-xl font-bold text-white leading-tight">{node.label}</h2>
            {node.subLabel && (
              <p className="text-sm text-slate-400 mt-1">{node.subLabel}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 border-b border-slate-800">
          <Tab
            active={activeTab === "content"}
            onClick={() => setActiveTab("content")}
            icon={<FileText className="w-4 h-4" />}
            label="Content"
          />
          <Tab
            active={activeTab === "metrics"}
            onClick={() => setActiveTab("metrics")}
            icon={<BarChart3 className="w-4 h-4" />}
            label="Metrics"
          />
          <Tab
            active={activeTab === "history"}
            onClick={() => setActiveTab("history")}
            icon={<History className="w-4 h-4" />}
            label={`History${history.length > 0 ? ` (${history.length})` : ""}`}
          />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "content" && <ContentPanel node={node} landingSlug={landingSlug} />}
          {activeTab === "metrics" && <MetricsPanel node={node} />}
          {activeTab === "history" && <HistoryPanel history={history} />}
        </div>
      </aside>
    </>
  );
}

// ---------------------------------------------------------------------------
// Tab button
// ---------------------------------------------------------------------------

function Tab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-blue-500 text-blue-400"
          : "border-transparent text-slate-400 hover:text-slate-200"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Content panel — shows the actual text/config for the node
// ---------------------------------------------------------------------------

function ContentPanel({ node, landingSlug }: { node: CampaignNode; landingSlug: string | null }) {
  const data = node.data as Record<string, unknown> | undefined;

  switch (node.kind) {
    case "campaign": {
      const brief = data?.brief as { offer_description?: string; offer_price_cents?: number; status?: string } | undefined;
      const funnel = data?.funnel as { landing_page_slug?: string | null; status?: string } | undefined;
      return (
        <div className="space-y-4">
          <Section title="Offer">
            <p className="text-slate-200 whitespace-pre-wrap">
              {brief?.offer_description ?? "—"}
            </p>
            {brief?.offer_price_cents && (
              <p className="text-slate-400 mt-2 text-sm">
                Price: ${(brief.offer_price_cents / 100).toLocaleString()}
              </p>
            )}
          </Section>
          {funnel?.landing_page_slug && (
            <Section title="Live URLs">
              <div className="flex flex-col gap-2">
                <LiveLink href={`/${funnel.landing_page_slug}?variant=long`} label="Preview Long-form" />
                <LiveLink href={`/${funnel.landing_page_slug}?variant=short`} label="Preview Short-form" />
                <LiveLink href={`/${funnel.landing_page_slug}`} label="Live URL (random)" />
              </div>
            </Section>
          )}
        </div>
      );
    }

    case "ad": {
      const ad = data as { headline?: string; primary_text?: string; description?: string; cta_text?: string; platform?: string; status?: string } | undefined;
      return (
        <div className="space-y-4">
          <Section title="Headline">
            <p className="text-lg font-semibold text-white">{ad?.headline ?? "—"}</p>
          </Section>
          <Section title="Primary text">
            <p className="text-slate-200 whitespace-pre-wrap">{ad?.primary_text ?? "—"}</p>
          </Section>
          <Section title="Description">
            <p className="text-slate-300">{ad?.description ?? "—"}</p>
          </Section>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="CTA text" value={ad?.cta_text ?? "—"} />
            <Stat label="Platform" value={ad?.platform ?? "—"} />
            <Stat label="Status" value={ad?.status ?? "draft"} />
          </div>
        </div>
      );
    }

    case "landing_variant": {
      const variant = data as { variant_label?: string; variant_content?: unknown } | undefined;
      const content = variant?.variant_content as { variant?: string; page?: { hero?: { headline?: string; subheadline?: string; cta_text?: string }; sections?: unknown[] } } | undefined;
      const hero = content?.page?.hero;
      return (
        <div className="space-y-4">
          {landingSlug && variant?.variant_label && (
            <LiveLink
              href={`/${landingSlug}?variant=${variant.variant_label.toLowerCase().replace(/-.*/, "")}`}
              label="Open live page"
            />
          )}
          <Section title="Hero headline">
            <p className="text-lg font-semibold text-white">{hero?.headline ?? "—"}</p>
          </Section>
          <Section title="Subheadline">
            <p className="text-slate-200">{hero?.subheadline ?? "—"}</p>
          </Section>
          <Section title="CTA">
            <p className="text-slate-200">{hero?.cta_text ?? "—"}</p>
          </Section>
          {content?.page?.sections && Array.isArray(content.page.sections) && (
            <Section title="Sections">
              <p className="text-slate-400 text-sm">
                {content.page.sections.length} section{content.page.sections.length === 1 ? "" : "s"}
              </p>
            </Section>
          )}
        </div>
      );
    }

    case "email_step": {
      const step = data as { subject?: string; delay_hours?: number; body_html?: string; body_text?: string } | undefined;
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Subject" value={step?.subject ?? "—"} />
            <Stat
              label="Delay"
              value={step?.delay_hours === 0 ? "Immediate" : `+${step?.delay_hours}h`}
            />
          </div>
          <Section title="Email body">
            {step?.body_html ? (
              <div
                className="prose prose-invert prose-sm max-w-none bg-slate-950 rounded-lg p-4 border border-slate-800"
                dangerouslySetInnerHTML={{ __html: step.body_html }}
              />
            ) : (
              <pre className="text-sm text-slate-200 whitespace-pre-wrap bg-slate-950 rounded-lg p-4 border border-slate-800 font-sans">
                {step?.body_text ?? "—"}
              </pre>
            )}
          </Section>
        </div>
      );
    }

    case "sms_step": {
      const step = data as { message?: string; delay_hours?: number } | undefined;
      return (
        <div className="space-y-4">
          <Stat
            label="Delay"
            value={
              step?.delay_hours !== undefined
                ? step.delay_hours < 1
                  ? `+${Math.round(step.delay_hours * 60)}min`
                  : `+${step.delay_hours}h`
                : "—"
            }
          />
          <Section title="Message">
            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 max-w-md">
              <p className="text-slate-200">{step?.message ?? "—"}</p>
              <p className="text-xs text-slate-500 mt-2">
                {step?.message?.length ?? 0} chars
              </p>
            </div>
          </Section>
        </div>
      );
    }

    case "ai_agent":
      return (
        <div className="space-y-4">
          <Section title="About">
            <p className="text-slate-200">
              The AI sales agent qualifies inbound leads via SMS and email, handles objections, and books
              qualified prospects into your calendar 24/7.
            </p>
          </Section>
          <Section title="Capabilities">
            <ul className="space-y-2">
              {[
                "BANT qualification (Budget, Authority, Need, Timeline)",
                "Objection handling on price, timing, trust, need, competitor",
                "Conversational SMS + email",
                "Auto-booking to calendar when qualified",
                "Escalation to human when lead is out of scope",
              ].map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  {c}
                </li>
              ))}
            </ul>
          </Section>
        </div>
      );

    case "pipeline_stage": {
      const stage = data as { stage_name?: string; stage_type?: string; stage_order?: number } | undefined;
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Stage" value={stage?.stage_name ?? "—"} />
            <Stat label="Order" value={`#${stage?.stage_order ?? "?"}`} />
            <Stat label="Type" value={stage?.stage_type ?? "—"} />
          </div>
          <Section title="About">
            <p className="text-slate-300 text-sm">
              SOPHIA monitors this stage every 30 minutes and will automatically trigger optimizations
              if the conversion rate drops below baseline.
            </p>
          </Section>
        </div>
      );
    }

    case "booking": {
      return (
        <div className="space-y-4">
          <Section title="About">
            <p className="text-slate-200">
              Final conversion step — qualified leads are routed here to book a call or purchase.
              Integrations with Calendly and Stripe feed conversion data back into the funnel.
            </p>
          </Section>
          <Section title="Not yet connected">
            <p className="text-sm text-amber-300/80">
              Connect Calendly + Stripe in Settings to pull live booking and revenue data into this node.
            </p>
          </Section>
        </div>
      );
    }

    default:
      return (
        <pre className="text-xs text-slate-400 whitespace-pre-wrap bg-slate-950 rounded-lg p-4 border border-slate-800">
          {JSON.stringify(data, null, 2)}
        </pre>
      );
  }
}

// ---------------------------------------------------------------------------
// Metrics panel
// ---------------------------------------------------------------------------

function MetricsPanel({ node }: { node: CampaignNode }) {
  const m = node.metrics;
  if (!m) {
    return <p className="text-sm text-slate-500">No metrics tracked for this node yet.</p>;
  }

  const items = [
    { label: m.primary_label, value: m.primary_value },
    { label: m.secondary_label, value: m.secondary_value },
    { label: m.tertiary_label, value: m.tertiary_value },
  ].filter((i): i is { label: string; value: string } => !!i.label && !!i.value);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {items.map((item, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-800 bg-slate-900 p-4"
          >
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">
              {item.label}
            </p>
            <p className="text-2xl font-bold text-white">{item.value}</p>
          </div>
        ))}
      </div>

      {m.conversion_rate !== undefined && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">
            Conversion Rate
          </p>
          <div className="flex items-baseline gap-3">
            <p className="text-3xl font-bold text-white">
              {(m.conversion_rate * 100).toFixed(2)}%
            </p>
            <HealthBadge health={m.health ?? "inactive"} />
          </div>
          <div className="mt-3 h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full ${
                m.health === "healthy" ? "bg-emerald-400" : m.health === "warning" ? "bg-amber-400" : m.health === "critical" ? "bg-red-400" : "bg-slate-600"
              }`}
              style={{ width: `${Math.min(100, m.conversion_rate * 100 * 5)}%` }}
            />
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">
          SOPHIA Monitoring
        </p>
        <p className="text-sm text-slate-300">
          {m.health === "inactive"
            ? "No activity yet. Metrics will populate once the funnel starts receiving traffic."
            : m.health === "healthy"
            ? "This node is performing at or above baseline. No action needed."
            : m.health === "warning"
            ? "Performance has dipped below baseline. SOPHIA may trigger an optimization on the next 30-minute cycle."
            : "Critical performance drop. SOPHIA will attempt an auto-fix in the next cycle or escalate if action limit is reached."}
        </p>
      </div>
    </div>
  );
}

function HealthBadge({ health }: { health: string }) {
  const cfg: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    healthy: {
      label: "Healthy",
      className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      icon: <TrendingUp className="w-3 h-3" />,
    },
    warning: {
      label: "Needs attention",
      className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      icon: <AlertCircle className="w-3 h-3" />,
    },
    critical: {
      label: "Critical",
      className: "bg-red-500/15 text-red-400 border-red-500/30",
      icon: <TrendingDown className="w-3 h-3" />,
    },
    inactive: {
      label: "No data yet",
      className: "bg-slate-500/15 text-slate-400 border-slate-500/30",
      icon: <Clock className="w-3 h-3" />,
    },
  };
  const c = cfg[health] ?? cfg.inactive;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${c.className}`}>
      {c.icon}
      {c.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// History panel
// ---------------------------------------------------------------------------

function HistoryPanel({ history }: { history: OptimizationHistoryEntry[] }) {
  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <Bot className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400">No changes yet</p>
        <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto">
          SOPHIA's optimization engine will log every change it makes to this node here — what was changed, why, and the measured impact.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((entry) => (
        <HistoryRow key={entry.id} entry={entry} />
      ))}
    </div>
  );
}

function HistoryRow({ entry }: { entry: OptimizationHistoryEntry }) {
  const verdictStyle: Record<string, string> = {
    positive: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
    neutral: "bg-slate-500/10 border-slate-500/30 text-slate-300",
    negative: "bg-red-500/10 border-red-500/30 text-red-300",
  };
  const statusStyle: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-400",
    approved: "bg-blue-500/15 text-blue-400",
    executing: "bg-cyan-500/15 text-cyan-400",
    executed: "bg-emerald-500/15 text-emerald-400",
    failed: "bg-red-500/15 text-red-400",
    reverted: "bg-slate-500/15 text-slate-400",
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-white">
            {entry.action_type.replace(/_/g, " ")}
          </span>
        </div>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            statusStyle[entry.status] ?? "bg-slate-500/15 text-slate-400"
          }`}
        >
          {entry.status}
        </span>
      </div>

      <p className="text-sm text-slate-300 leading-relaxed mb-3">{entry.diagnosis}</p>

      {entry.impact_verdict && (
        <div className={`text-xs px-3 py-2 rounded-lg border ${verdictStyle[entry.impact_verdict] ?? "bg-slate-500/10 border-slate-500/30 text-slate-300"}`}>
          <span className="font-semibold capitalize">{entry.impact_verdict}</span>
          {entry.impact_delta !== undefined && entry.impact_delta !== null && (
            <span className="ml-2">
              {entry.impact_delta > 0 ? "+" : ""}
              {(entry.impact_delta * 100).toFixed(1)}%
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-slate-500 mt-3">
        <Clock className="w-3 h-3" />
        <span>{new Date(entry.created_at).toLocaleString()}</span>
        <span className="text-slate-700">•</span>
        <span className="capitalize">{entry.risk_tier} risk</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small shared components
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-sm font-semibold text-white truncate">{value}</p>
    </div>
  );
}

function LiveLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors w-fit"
    >
      <ExternalLink className="w-4 h-4" />
      {label}
    </a>
  );
}

function prettyKind(kind: CampaignNode["kind"]): string {
  const map: Record<CampaignNode["kind"], string> = {
    campaign: "Campaign",
    ad: "Ad Creative",
    landing_variant: "Landing Page Variant",
    email_step: "Email Step",
    sms_step: "SMS Step",
    ai_agent: "AI Sales Agent",
    pipeline_stage: "Pipeline Stage",
    booking: "Booking / Checkout",
  };
  return map[kind] ?? kind;
}
