"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Layout, Mail, MessageSquare, Megaphone, Bot, Layers,
  Check, Edit3, ChevronLeft, ChevronRight, Rocket, AlertCircle
} from "lucide-react";

// Mock generated content — will be loaded from API in production
const mockGenerated = {
  landing_page: {
    headline: "Stop Losing 20+ Hours a Week to Broken Operations",
    subheadline: "Get a custom operations playbook that cuts your team's wasted time by 60% in 30 days — or your money back.",
    body_html: "<p>You didn't start your business to spend half your day on admin, follow-ups, and manual processes that should run themselves.</p><p>Our Business Ops Accelerator gives you a proven system to streamline your operations so you can focus on what actually grows your business.</p><h3>What You Get:</h3><ul><li>Custom operations audit and process map</li><li>Automated workflow implementation</li><li>Team training and SOPs</li><li>30-day optimization support</li></ul>",
    cta_text: "Get Your Operations Audit",
    form_title: "Start Your Transformation",
    meta_title: "Business Ops Accelerator | Metric Mentor Labs",
    meta_description: "Cut wasted time by 60% in 30 days with our proven operations system.",
  },
  email_sequence: [
    { step_order: 1, delay_hours: 0, subject: "Welcome — here's what happens next", body_text: "Hey {first_name},\n\nThanks for taking the first step toward fixing your operations.\n\nI'm Steve from Metric Mentor Labs, and I've helped 40+ businesses cut their wasted time by 60% or more.\n\nHere's what happens next:\n1. We'll reach out via text to learn about your specific situation\n2. If we're a fit, we'll set up a quick strategy call\n3. You'll walk away with a clear action plan\n\nTalk soon,\nSteve", purpose: "Welcome + set expectations" },
    { step_order: 2, delay_hours: 24, subject: "The #1 operations mistake growing businesses make", body_text: "Hey {first_name},\n\nThe biggest mistake I see? Hiring more people to fix broken processes.\n\nMore people + bad systems = more chaos, not less.\n\nThe fix is always the same: fix the system first, then scale the team.\n\nThat's exactly what we do in the Business Ops Accelerator.\n\nWant to see how it works for your specific situation?\n\n→ Reply to this email or book a call: {booking_url}\n\nSteve", purpose: "Value + pain point" },
    { step_order: 3, delay_hours: 72, subject: "Case study: How {client} saved 18 hours/week", body_text: "Hey {first_name},\n\nQuick story...\n\nOne of our clients was spending 18 hours a week on manual invoicing, follow-ups, and team coordination.\n\nAfter our Operations Accelerator, they automated 80% of it. The founder got 3 full days back every week.\n\nTheir revenue went up 40% in the next quarter — not because they worked harder, but because they finally had time to focus on growth.\n\nCurious if we could do something similar for you?\n\n→ {booking_url}\n\nSteve", purpose: "Social proof + case study" },
    { step_order: 4, delay_hours: 120, subject: "Quick question for you", body_text: "Hey {first_name},\n\nI noticed you signed up to learn about fixing your operations but haven't booked a call yet.\n\nNo pressure at all — but I'm curious: what's the ONE operational headache that costs you the most time right now?\n\nJust hit reply and let me know. I might have a quick fix I can share.\n\nSteve", purpose: "Re-engagement + conversation starter" },
    { step_order: 5, delay_hours: 168, subject: "Last chance: Free operations audit this week", body_text: "Hey {first_name},\n\nThis is my last email about this — I don't want to be that person.\n\nBut I wanted to let you know we're offering free 30-minute operations audits this week. No pitch, no pressure. Just a clear look at where you're losing time and what to fix first.\n\nIf you're interested: {booking_url}\n\nIf not, no worries. I'll still send you helpful ops content from time to time.\n\nSteve", purpose: "Final CTA + urgency" },
  ],
  sms_sequence: [
    { step_order: 1, delay_hours: 0.25, message: "Hey {first_name}! Steve from Metric Mentor Labs here. Thanks for checking out the Ops Accelerator. Quick Q: what's your biggest operational headache right now?", purpose: "Initial outreach" },
    { step_order: 2, delay_hours: 48, message: "Hey {first_name}, just following up. Would a quick 15-min call help? I can usually spot the #1 time-waster in your ops in minutes: {booking_url}", purpose: "Follow-up" },
    { step_order: 3, delay_hours: 120, message: "Last one from me {first_name} — we're doing free ops audits this week. Spots are limited. Grab one here if interested: {booking_url}", purpose: "Final push" },
  ],
  ad_creatives: [
    { headline: "Stop Working IN Your Business", primary_text: "You're spending 20+ hours a week on tasks that should run themselves.\n\nOur Operations Accelerator has helped 40+ businesses cut wasted time by 60% in 30 days.\n\n✅ Custom process audit\n✅ Automated workflows\n✅ Team training & SOPs\n✅ 30-day support\n\nMoney-back guarantee. Get your free ops audit →", description: "Cut wasted time by 60% in 30 days", cta_text: "Learn More", creative_type: "image", image_brief: "Clean desk with laptop showing streamlined dashboard. Professional, aspirational." },
    { headline: "18 Hours/Week Back", primary_text: "Our client was drowning in manual processes. Invoicing. Follow-ups. Team coordination.\n\nAfter our Ops Accelerator: 80% automated. 18 hours/week back. Revenue up 40%.\n\nSame team. Better systems.\n\nGet your free operations audit →", description: "Real results from real businesses", cta_text: "Get Free Audit", creative_type: "image", image_brief: "Before/after split: cluttered desk vs clean organized workspace. Transformation visual." },
    { headline: "Your Operations Are Broken", primary_text: "If you're hiring more people to fix broken processes, you're making the #1 mistake growing businesses make.\n\nMore people + bad systems = more chaos.\n\nFix the system first. Then scale.\n\nBook a free ops audit and find out exactly where you're leaking time →", description: "Fix the system, then scale the team", cta_text: "Book Free Audit", creative_type: "image", image_brief: "Metaphor: tangled wires vs clean cable management. Simple, powerful contrast." },
  ],
  ai_agent_prompt: {
    system_prompt: "You are a sales assistant for Metric Mentor Labs' Business Ops Accelerator. Your persona is Steve's assistant — friendly, direct, consultative. The offer is a $3,000 operations consulting engagement. Qualify using BANT.",
    qualification_criteria: "Budget: Can invest $3k+. Authority: Decision maker or can influence. Need: Currently losing 10+ hrs/week to manual processes. Timeline: Ready to start within 30 days.",
    objection_responses: "Price: 'The ROI is typically 10x within 90 days — one client saved $15k/month in wasted labor. Would it help to see the math for your specific situation?'. Timing: 'Totally understand. When would be a better time? I can lock in current pricing for 30 days.'. Trust: 'Great question — we offer a money-back guarantee. If you don't see measurable improvement in 30 days, full refund.'",
  },
  funnel_stages: [
    { stage_name: "Ad Impressions", stage_type: "ad_impression", stage_order: 1, baseline_value: 0.02, warning_threshold: 0.015, critical_threshold: 0.01 },
    { stage_name: "Landing Page Views", stage_type: "page_view", stage_order: 2, baseline_value: 0.35, warning_threshold: 0.25, critical_threshold: 0.15 },
    { stage_name: "Form Submissions", stage_type: "page_conversion", stage_order: 3, baseline_value: 0.15, warning_threshold: 0.10, critical_threshold: 0.05 },
    { stage_name: "Email Opens", stage_type: "email_opened", stage_order: 4, baseline_value: 0.40, warning_threshold: 0.30, critical_threshold: 0.20 },
    { stage_name: "AI Qualification", stage_type: "qualified", stage_order: 5, baseline_value: 0.30, warning_threshold: 0.20, critical_threshold: 0.10 },
    { stage_name: "Calls Booked", stage_type: "booking_made", stage_order: 6, baseline_value: 0.25, warning_threshold: 0.15, critical_threshold: 0.08 },
    { stage_name: "Calls Attended", stage_type: "booking_attended", stage_order: 7, baseline_value: 0.70, warning_threshold: 0.55, critical_threshold: 0.40 },
    { stage_name: "Closed Won", stage_type: "closed_won", stage_order: 8, baseline_value: 0.25, warning_threshold: 0.15, critical_threshold: 0.08 },
  ],
};

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
  const [activeTab, setActiveTab] = useState("landing");
  const [launching, setLaunching] = useState(false);
  const [launched, setLaunched] = useState(false);
  const content = mockGenerated;

  async function handleLaunch() {
    setLaunching(true);
    // In production: POST /api/campaigns/launch with briefId
    await new Promise((r) => setTimeout(r, 3000));
    setLaunched(true);
    setLaunching(false);
  }

  if (launched) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Rocket className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Campaign Launched!</h2>
          <p className="text-slate-400 mb-6">
            Your funnel is live. Landing page deployed, email sequences activated, AI agent configured.
            The self-healing engine will start monitoring performance immediately.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push("/funnels")}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
            >
              View Funnel
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Review Generated Campaign</h1>
          <p className="text-slate-400">Review and edit the AI-generated content before launching.</p>
        </div>
        <button
          onClick={handleLaunch}
          disabled={launching}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
        >
          <Rocket className="w-5 h-5" />
          {launching ? "Launching..." : "Launch Campaign"}
        </button>
      </div>

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
              <button className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300">
                <Edit3 className="w-4 h-4" /> Edit
              </button>
            </div>
            <div className="bg-slate-950 rounded-lg p-8 border border-slate-800">
              <h1 className="text-3xl font-bold text-white mb-3">{content.landing_page.headline}</h1>
              <p className="text-lg text-slate-300 mb-6">{content.landing_page.subheadline}</p>
              <div className="text-slate-400 prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: content.landing_page.body_html }} />
              <div className="mt-6 p-4 bg-slate-900 rounded-lg border border-slate-700 max-w-sm">
                <p className="text-sm font-semibold text-white mb-2">{content.landing_page.form_title}</p>
                <div className="space-y-2">
                  <div className="h-8 bg-slate-800 rounded" />
                  <div className="h-8 bg-slate-800 rounded" />
                  <div className="h-10 bg-blue-600 rounded flex items-center justify-center text-sm text-white font-medium">{content.landing_page.cta_text}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs text-slate-500 mb-1">Meta Title</p>
              <p className="text-sm text-white">{content.landing_page.meta_title}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs text-slate-500 mb-1">Meta Description</p>
              <p className="text-sm text-white">{content.landing_page.meta_description}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "emails" && (
        <div className="space-y-4">
          {content.email_sequence.map((email, i) => (
            <div key={i} className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-sm font-bold text-blue-400">
                    {email.step_order}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">Email {email.step_order}: {email.subject}</p>
                    <p className="text-xs text-slate-500">
                      {email.delay_hours === 0 ? "Immediate" : `${email.delay_hours}h delay`} · {email.purpose}
                    </p>
                  </div>
                </div>
                <button className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300">
                  <Edit3 className="w-3 h-3" /> Edit
                </button>
              </div>
              <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans bg-slate-950 rounded-lg p-4 border border-slate-800">
                {email.body_text}
              </pre>
            </div>
          ))}
        </div>
      )}

      {activeTab === "sms" && (
        <div className="space-y-4">
          {content.sms_sequence.map((sms, i) => (
            <div key={i} className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center text-sm font-bold text-green-400">
                    {sms.step_order}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">SMS {sms.step_order}</p>
                    <p className="text-xs text-slate-500">
                      {sms.delay_hours < 1 ? `${Math.round(sms.delay_hours * 60)}min delay` : `${sms.delay_hours}h delay`} · {sms.purpose}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-slate-500">{sms.message.length} chars</span>
              </div>
              <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 max-w-md">
                <p className="text-sm text-slate-200">{sms.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "ads" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {content.ad_creatives.map((ad, i) => (
            <div key={i} className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
              <div className="h-48 bg-slate-800 flex items-center justify-center">
                <div className="text-center px-4">
                  <Megaphone className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">{ad.image_brief}</p>
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm text-white font-semibold mb-2">{ad.headline}</p>
                <p className="text-xs text-slate-300 whitespace-pre-wrap mb-3">{ad.primary_text}</p>
                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <p className="text-xs text-slate-400">{ad.description}</p>
                  <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">{ad.cta_text}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "agent" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Bot className="w-4 h-4 text-blue-400" /> System Prompt
            </h3>
            <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans bg-slate-950 rounded-lg p-4 border border-slate-800">
              {content.ai_agent_prompt.system_prompt}
            </pre>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-sm font-semibold text-white mb-3">Qualification Criteria</h3>
            <p className="text-sm text-slate-300">{content.ai_agent_prompt.qualification_criteria}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-sm font-semibold text-white mb-3">Objection Responses</h3>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{content.ai_agent_prompt.objection_responses}</p>
          </div>
        </div>
      )}

      {activeTab === "funnel" && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Funnel Stages & Baselines</h3>
          <div className="space-y-3">
            {content.funnel_stages.map((stage, i) => (
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
                    <p className="text-sm font-medium text-white">{(stage.baseline_value * 100).toFixed(0)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Warning</p>
                    <p className="text-sm font-medium text-yellow-400">{(stage.warning_threshold * 100).toFixed(0)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Critical</p>
                    <p className="text-sm font-medium text-red-400">{(stage.critical_threshold * 100).toFixed(0)}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
