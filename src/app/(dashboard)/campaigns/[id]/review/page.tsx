"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Layout, Mail, MessageSquare, Megaphone, Bot, Layers,
  Edit3, Rocket, AlertCircle, Loader2, ChevronLeft, ExternalLink,
} from "lucide-react";

interface LandingPage {
  headline?: string;
  subheadline?: string;
  body_html?: string;
  cta_text?: string;
  form_title?: string;
  meta_title?: string;
  meta_description?: string;
}

interface EmailStep {
  step_order: number;
  delay_hours: number;
  subject: string;
  body_text?: string;
  body_html?: string;
  purpose?: string;
}

interface SmsStep {
  step_order: number;
  delay_hours: number;
  message: string;
  purpose?: string;
}

interface AdCreative {
  headline: string;
  primary_text: string;
  description?: string;
  cta_text?: string;
  creative_type?: string;
  image_brief?: string;
}

interface AgentPrompt {
  system_prompt?: string;
  qualification_criteria?: string;
  objection_responses?: string | Record<string, string>;
  booking_signals?: string[];
}

interface FunnelStage {
  stage_name: string;
  stage_type: string;
  stage_order: number;
  baseline_value: number;
  warning_threshold: number;
  critical_threshold: number;
}

interface GeneratedContent {
  landing_page?: LandingPage;
  email_sequence?: EmailStep[];
  sms_sequence?: SmsStep[];
  ad_creatives?: AdCreative[];
  ai_agent_prompt?: AgentPrompt | string;
  funnel_stages?: FunnelStage[];
}

interface Brief {
  id: string;
  status: string;
  brand_name: string;
  offer_name: string;
  generated_content: GeneratedContent | null;
  funnel_id: string | null;
  landing_page_slug: string | null;
}

const reviewTabs = [
  { id: "landing", label: "Landing Page", icon: Layout },
  { id: "emails", label: "Email Sequence", icon: Mail },
  { id: "sms", label: "SMS Sequence", icon: MessageSquare },
  { id: "ads", label: "Ad Creatives", icon: Megaphone },
  { id: "agent", label: "AI Agent", icon: Bot },
  { id: "funnel", label: "Funnel Stages", icon: Layers },
];

export default function CampaignReviewPage() {
  const params = useParams();
  const router = useRouter();
  const briefId = params.id as string;

  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState("landing");
  const [launching, setLaunching] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [funnelId, setFunnelId] = useState<string | null>(null);
  const [landingSlug, setLandingSlug] = useState<string | null>(null);

  // Load the brief on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/campaigns/brief/${briefId}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Failed to load brief" }));
          throw new Error(err.error ?? "Failed to load brief");
        }
        const data = (await res.json()) as Brief;
        if (!cancelled) {
          setBrief(data);
          if (data.status === "launched" && data.funnel_id) {
            setLaunched(true);
            setFunnelId(data.funnel_id);
            setLandingSlug(data.landing_page_slug ?? null);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [briefId]);

  async function handleLaunch() {
    setLaunching(true);
    setLaunchError(null);
    try {
      const res = await fetch("/api/campaigns/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ briefId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Launch failed" }));
        throw new Error(err.error ?? "Launch failed");
      }
      const data = await res.json();
      setFunnelId(data.funnelId);
      setLandingSlug(data.landingPageSlug ?? null);
      setLaunched(true);
    } catch (err) {
      setLaunchError(err instanceof Error ? err.message : "Launch failed");
    } finally {
      setLaunching(false);
    }
  }

  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading campaign...</p>
        </div>
      </div>
    );
  }

  // Load error
  if (loadError || !brief) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Couldn&apos;t Load Campaign</h2>
          <p className="text-slate-400 mb-6">{loadError ?? "Brief not found"}</p>
          <button
            onClick={() => router.push("/campaigns")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
          >
            Back to Campaigns
          </button>
        </div>
      </div>
    );
  }

  // No generated content
  if (!brief.generated_content) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No Generated Content Yet</h2>
          <p className="text-slate-400 mb-6">
            This brief hasn&apos;t been run through AI generation. Go back and click Generate.
          </p>
          <button
            onClick={() => router.push("/campaigns")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
          >
            Back to Campaigns
          </button>
        </div>
      </div>
    );
  }

  // Launched
  if (launched) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-lg">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Rocket className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Campaign Launched!</h2>
          <p className="text-slate-400 mb-6">
            Your funnel is live. Landing page deployed, email sequences activated, AI agent configured.
            The self-healing engine will start monitoring performance immediately.
          </p>

          {landingSlug && (
            <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
              <p className="text-xs uppercase tracking-wider text-emerald-300 mb-2">
                Your live landing page
              </p>
              <code className="block text-sm text-emerald-200 mb-4 break-all">
                {typeof window !== "undefined" ? window.location.origin : ""}/{landingSlug}
              </code>
              <a
                href={`/${landingSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors"
              >
                Open Live Funnel
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push("/funnels")}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
            >
              View All Funnels
            </button>
            <button
              onClick={() => router.push("/campaigns")}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg"
            >
              All Campaigns
            </button>
          </div>
        </div>
      </div>
    );
  }

  const content = brief.generated_content;
  const landing = content.landing_page ?? {};
  const emails = content.email_sequence ?? [];
  const sms = content.sms_sequence ?? [];
  const ads = content.ad_creatives ?? [];
  const agent =
    typeof content.ai_agent_prompt === "string"
      ? { system_prompt: content.ai_agent_prompt }
      : content.ai_agent_prompt ?? {};
  const stages = content.funnel_stages ?? [];

  return (
    <div>
      {/* Back link */}
      <button
        onClick={() => router.push("/campaigns")}
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 mb-4"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Campaigns
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{brief.offer_name}</h1>
          <p className="text-slate-400">
            Review the AI-generated content before launching ({brief.brand_name})
          </p>
        </div>
        <button
          onClick={handleLaunch}
          disabled={launching}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
        >
          {launching ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Launching...
            </>
          ) : (
            <>
              <Rocket className="w-5 h-5" />
              Launch Campaign
            </>
          )}
        </button>
      </div>

      {launchError && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-300">Launch failed</p>
            <p className="text-sm text-red-200/80 mt-1">{launchError}</p>
          </div>
          <button
            onClick={() => setLaunchError(null)}
            className="text-red-400 hover:text-red-300 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Review Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-800 overflow-x-auto">
        {reviewTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "landing" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Landing Page Preview</h2>
              <button className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 opacity-50 cursor-not-allowed" disabled>
                <Edit3 className="w-4 h-4" /> Edit (coming soon)
              </button>
            </div>
            <div className="bg-slate-950 rounded-lg p-8 border border-slate-800">
              {landing.headline && (
                <h1 className="text-3xl font-bold text-white mb-3">{landing.headline}</h1>
              )}
              {landing.subheadline && (
                <p className="text-lg text-slate-300 mb-6">{landing.subheadline}</p>
              )}
              {landing.body_html && (
                <div
                  className="text-slate-400 prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: landing.body_html }}
                />
              )}
              <div className="mt-6 p-4 bg-slate-900 rounded-lg border border-slate-700 max-w-sm">
                <p className="text-sm font-semibold text-white mb-2">
                  {landing.form_title ?? "Get Started"}
                </p>
                <div className="space-y-2">
                  <div className="h-8 bg-slate-800 rounded" />
                  <div className="h-8 bg-slate-800 rounded" />
                  <div className="h-10 bg-blue-600 rounded flex items-center justify-center text-sm text-white font-medium">
                    {landing.cta_text ?? "Submit"}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {(landing.meta_title || landing.meta_description) && (
            <div className="grid grid-cols-2 gap-4">
              {landing.meta_title && (
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs text-slate-500 mb-1">Meta Title</p>
                  <p className="text-sm text-white">{landing.meta_title}</p>
                </div>
              )}
              {landing.meta_description && (
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs text-slate-500 mb-1">Meta Description</p>
                  <p className="text-sm text-white">{landing.meta_description}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "emails" && (
        <div className="space-y-4">
          {emails.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-sm">No emails generated</div>
          )}
          {emails.map((email, i) => (
            <div key={i} className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-sm font-bold text-blue-400">
                    {email.step_order}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Email {email.step_order}: {email.subject}
                    </p>
                    <p className="text-xs text-slate-500">
                      {email.delay_hours === 0 ? "Immediate" : `${email.delay_hours}h delay`}
                      {email.purpose ? ` · ${email.purpose}` : ""}
                    </p>
                  </div>
                </div>
              </div>
              <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans bg-slate-950 rounded-lg p-4 border border-slate-800">
                {email.body_text ?? email.body_html ?? ""}
              </pre>
            </div>
          ))}
        </div>
      )}

      {activeTab === "sms" && (
        <div className="space-y-4">
          {sms.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-sm">No SMS generated</div>
          )}
          {sms.map((s, i) => (
            <div key={i} className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center text-sm font-bold text-green-400">
                    {s.step_order}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">SMS {s.step_order}</p>
                    <p className="text-xs text-slate-500">
                      {s.delay_hours < 1
                        ? `${Math.round(s.delay_hours * 60)}min delay`
                        : `${s.delay_hours}h delay`}
                      {s.purpose ? ` · ${s.purpose}` : ""}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-slate-500">{s.message.length} chars</span>
              </div>
              <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 max-w-md">
                <p className="text-sm text-slate-200">{s.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "ads" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {ads.length === 0 && (
            <div className="col-span-3 text-center py-12 text-slate-500 text-sm">No ads generated</div>
          )}
          {ads.map((ad, i) => (
            <div key={i} className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
              <div className="h-48 bg-slate-800 flex items-center justify-center">
                <div className="text-center px-4">
                  <Megaphone className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">{ad.image_brief ?? "Image brief"}</p>
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm text-white font-semibold mb-2">{ad.headline}</p>
                <p className="text-xs text-slate-300 whitespace-pre-wrap mb-3">{ad.primary_text}</p>
                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <p className="text-xs text-slate-400">{ad.description}</p>
                  {ad.cta_text && (
                    <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">{ad.cta_text}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "agent" && (
        <div className="space-y-4">
          {agent.system_prompt && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Bot className="w-4 h-4 text-blue-400" /> System Prompt
              </h3>
              <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans bg-slate-950 rounded-lg p-4 border border-slate-800">
                {agent.system_prompt}
              </pre>
            </div>
          )}
          {agent.qualification_criteria && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="text-sm font-semibold text-white mb-3">Qualification Criteria</h3>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{agent.qualification_criteria}</p>
            </div>
          )}
          {agent.objection_responses && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="text-sm font-semibold text-white mb-3">Objection Responses</h3>
              {typeof agent.objection_responses === "string" ? (
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{agent.objection_responses}</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(agent.objection_responses).map(([category, response]) => (
                    <div key={category} className="bg-slate-950 rounded-lg p-4 border border-slate-800">
                      <p className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-2">
                        {category.replace(/_/g, " ")}
                      </p>
                      <p className="text-sm text-slate-300 whitespace-pre-wrap">{response}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {agent.booking_signals && agent.booking_signals.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="text-sm font-semibold text-white mb-3">Booking Signals</h3>
              <p className="text-xs text-slate-500 mb-3">Cues from the conversation that mean a lead is ready to book</p>
              <ul className="space-y-2">
                {agent.booking_signals.map((signal, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{signal}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!agent.system_prompt && !agent.qualification_criteria && !agent.objection_responses && (
            <div className="text-center py-12 text-slate-500 text-sm">No AI agent prompt generated</div>
          )}
        </div>
      )}

      {activeTab === "funnel" && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Funnel Stages & Baselines</h3>
          {stages.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">No funnel stages generated</div>
          ) : (
            <div className="space-y-3">
              {stages.map((stage, i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-lg">
                  <span className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-sm font-bold text-white">
                    {stage.stage_order}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{stage.stage_name}</p>
                    <p className="text-xs text-slate-500">{stage.stage_type}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-slate-500">Baseline</p>
                      <p className="text-sm font-medium text-white">
                        {(stage.baseline_value * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Warning</p>
                      <p className="text-sm font-medium text-yellow-400">
                        {(stage.warning_threshold * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Critical</p>
                      <p className="text-sm font-medium text-red-400">
                        {(stage.critical_threshold * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
