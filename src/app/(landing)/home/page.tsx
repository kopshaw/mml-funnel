import Link from "next/link";
import {
  Zap, Target, Mail, MessageSquare, BarChart3, Bot,
  ArrowRight, Check, Shield, Clock, TrendingUp, RefreshCw,
  ChevronRight, Rocket, Brain, Eye, Wrench, DollarSign,
} from "lucide-react";

export const metadata = {
  title: "SOFIA | Self-Optimizing Funnel Intelligence & Automation",
  description: "Build a complete marketing funnel in minutes. AI creates your landing pages, emails, SMS sequences, and ad copy — then monitors and optimizes everything automatically.",
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-blue-500" />
            <span className="text-lg font-bold">SOFIA</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <Link
            href="/campaigns/new"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-sm text-blue-400 mb-8">
            <Zap className="w-4 h-4" />
            SOFIA — Self-Optimizing Funnel Intelligence
          </div>
          <p className="text-lg font-semibold text-blue-400 mb-4">Meet SOFIA</p>
          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
            Your Entire Funnel.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              Built, Run & Optimized
            </span>
            <br />
            By AI.
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Fill out one brief about your offer. AI builds your landing page, writes your email
            sequence, creates your SMS follow-ups, generates your ad copy, and sets up an AI
            sales agent — then monitors every metric and fixes problems before you even notice them.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/campaigns/new"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl transition-colors"
            >
              Build Your Funnel <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-medium text-lg rounded-xl transition-colors"
            >
              See How It Works
            </a>
          </div>
          <p className="text-sm text-slate-600 mt-6">
            No designers. No copywriters. No media buyers. No dev team.
          </p>
        </div>
      </section>

      {/* Problem */}
      <section className="py-20 px-6 border-t border-slate-800/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Building Funnels Is Broken
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Right now, launching a single marketing funnel requires coordinating 6+ tools,
              3+ freelancers, and weeks of back-and-forth. Then nobody watches the metrics.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Clock,
                title: "Weeks to Launch",
                desc: "Hire a copywriter, wait for drafts, hire a designer, wait for pages, set up email tools, configure ads. 3-6 weeks minimum.",
              },
              {
                icon: DollarSign,
                title: "$5-15K Per Funnel",
                desc: "Copywriter ($2-5K), designer ($1-3K), email setup ($500-1K), ad management ($1-3K/mo), dev work ($1-3K). It adds up fast.",
              },
              {
                icon: Eye,
                title: "Nobody Watches It",
                desc: "Once launched, funnels break silently. Ad costs creep up, email open rates drop, landing pages stop converting. Nobody notices for weeks.",
              },
            ].map((item) => (
              <div key={item.title} className="p-6 rounded-xl border border-red-500/20 bg-red-500/5">
                <item.icon className="w-8 h-8 text-red-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution - How It Works */}
      <section id="how-it-works" className="py-20 px-6 border-t border-slate-800/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-sm text-green-400 mb-4">
              The Solution
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              From Brief to Live Funnel in Minutes
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Three steps. That&apos;s it. Fill out the brief, review what AI built, click launch.
              Everything else is automated.
            </p>
          </div>

          <div className="space-y-16">
            {/* Step 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold">1</span>
                  <h3 className="text-2xl font-bold">Fill Out Your Brief</h3>
                </div>
                <p className="text-slate-400 mb-6 leading-relaxed">
                  Tell us about your brand, your offer, and your audience. Upload testimonials,
                  case studies, and any proof you have. The more context you give, the better
                  the AI performs.
                </p>
                <ul className="space-y-3">
                  {["Brand voice & identity", "Offer details & pricing", "Target audience & pain points", "Testimonials & social proof", "Budget & campaign goals"].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
                <div className="space-y-4">
                  <div className="h-3 w-32 bg-slate-800 rounded" />
                  <div className="h-10 bg-slate-800 rounded-lg" />
                  <div className="h-3 w-24 bg-slate-800 rounded" />
                  <div className="h-24 bg-slate-800 rounded-lg" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-10 bg-slate-800 rounded-lg" />
                    <div className="h-10 bg-slate-800 rounded-lg" />
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-8 flex-1 bg-blue-500/20 border border-blue-500/30 rounded-lg" />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1 bg-slate-900 rounded-2xl border border-slate-800 p-6">
                <div className="flex gap-2 mb-4">
                  {["Landing Page", "Emails", "SMS", "Ads", "AI Agent"].map((tab) => (
                    <span key={tab} className="px-3 py-1 text-xs bg-slate-800 rounded-full text-slate-400">
                      {tab}
                    </span>
                  ))}
                </div>
                <div className="space-y-3">
                  <div className="h-4 w-3/4 bg-white/10 rounded" />
                  <div className="h-3 w-full bg-slate-800 rounded" />
                  <div className="h-3 w-5/6 bg-slate-800 rounded" />
                  <div className="h-3 w-4/6 bg-slate-800 rounded" />
                  <div className="h-10 w-48 bg-blue-600 rounded-lg mt-4" />
                </div>
              </div>
              <div className="order-1 md:order-2">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold">2</span>
                  <h3 className="text-2xl font-bold">AI Builds Everything</h3>
                </div>
                <p className="text-slate-400 mb-6 leading-relaxed">
                  In under 60 seconds, AI generates your complete funnel. Review each piece,
                  edit anything you want, then approve it.
                </p>
                <ul className="space-y-3">
                  {[
                    "High-converting landing page with your brand voice",
                    "5-7 email nurture sequence with proven frameworks",
                    "3-4 SMS follow-up messages",
                    "3 ad creative variants with image briefs",
                    "AI sales agent configured for your offer",
                    "Funnel stages with performance baselines",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Step 3 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold">3</span>
                  <h3 className="text-2xl font-bold">Launch & SOFIA Optimizes</h3>
                </div>
                <p className="text-slate-400 mb-6 leading-relaxed">
                  One click deploys everything. Your landing page goes live, email sequences activate,
                  SMS starts firing, Meta ads launch, and the AI sales agent starts qualifying leads.
                  Then SOFIA's optimization engine takes over.
                </p>
                <ul className="space-y-3">
                  {[
                    "Monitors every funnel stage every 30 minutes",
                    "Detects conversion drops before you notice",
                    "AI diagnoses the root cause automatically",
                    "Swaps underperforming copy, adjusts ad budgets",
                    "Reviews impact and keeps or reverts changes",
                    "Escalates to you only when it needs human judgment",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm text-green-400 font-medium">SOFIA Active</span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Ad CTR", value: "2.4%", health: "green" },
                    { label: "Landing Page", value: "18.2%", health: "green" },
                    { label: "Email Open Rate", value: "41%", health: "green" },
                    { label: "Booking Rate", value: "12%", health: "yellow" },
                    { label: "Close Rate", value: "28%", health: "green" },
                  ].map((stage) => (
                    <div key={stage.label} className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                      <span className="text-sm text-slate-300">{stage.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{stage.value}</span>
                        <div className={`w-2 h-2 rounded-full ${
                          stage.health === "green" ? "bg-green-500" : "bg-yellow-500"
                        }`} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-blue-300">AI detected booking rate drop. Swapped email CTA. Reviewing impact...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-6 border-t border-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need. Nothing You Don&apos;t.</h2>
            <p className="text-lg text-slate-400">One system replaces your entire marketing stack.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Rocket, title: "AI Campaign Builder", desc: "Fill out a brief, AI generates your complete funnel — landing page, emails, SMS, ad copy, and sales agent — in under 60 seconds." },
              { icon: Target, title: "Dynamic Landing Pages", desc: "Server-side A/B tested pages that auto-optimize. SOFIA's optimization engine swaps headlines, CTAs, and layouts based on performance." },
              { icon: Mail, title: "Email Sequences", desc: "Automated nurture sequences built from proven frameworks. AI writes the copy, the system sends on schedule, tracks every open and click." },
              { icon: MessageSquare, title: "SMS Follow-Up", desc: "Conversational text sequences that feel personal. Automated timing, reply handling, and opt-out management via Twilio." },
              { icon: Bot, title: "AI Sales Agent", desc: "Claude-powered lead qualification via text and email. Handles objections, books calls, and pushes qualified leads to your CRM." },
              { icon: BarChart3, title: "Full Analytics Dashboard", desc: "Real-time visibility into every metric: traffic, spend, conversions, revenue, ROAS, pipeline stages, AI conversation stats." },
              { icon: RefreshCw, title: "SOFIA Optimization Engine", desc: "Monitors every funnel stage every 30 minutes. Detects drops, diagnoses root causes, and fixes issues automatically." },
              { icon: Brain, title: "SOFIA Intelligence", desc: "When something breaks, SOFIA analyzes the data, identifies the likely cause, and recommends or executes the right fix." },
              { icon: Shield, title: "Safety Guards", desc: "Max 3 auto-actions per day. Single-variable testing. Auto-revert if a change hurts performance. Escalation after 3 failures." },
              { icon: TrendingUp, title: "Revenue Attribution", desc: "Track every dollar from ad click to closed deal. Know exactly which campaigns, funnels, and AI actions drive revenue." },
              { icon: DollarSign, title: "Meta Ads Integration", desc: "AI creates your campaigns, monitors performance, adjusts budgets, and launches new creative variants — all automatically." },
              { icon: Zap, title: "Multi-Client Support", desc: "Run funnels for multiple clients from one dashboard. Each client gets their own data, funnels, and optional login." },
            ].map((feature) => (
              <div key={feature.title} className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 transition-colors">
                <feature.icon className="w-8 h-8 text-blue-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Stack */}
      <section className="py-20 px-6 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">What It Replaces</h2>
          <p className="text-lg text-slate-400 mb-12">One platform. Everything automated.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              "Copywriter", "Landing Page Builder", "Email Platform",
              "SMS Tool", "Ad Manager", "CRM", "Analytics Suite", "Sales Team"
            ].map((tool) => (
              <div key={tool} className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 relative">
                <span className="text-sm text-slate-400 line-through">{tool}</span>
                <div className="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="py-20 px-6 border-t border-slate-800/50">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-b from-blue-500/10 to-transparent p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Meet SOFIA?
            </h2>
            <p className="text-lg text-slate-400 mb-8 max-w-xl mx-auto">
              Stop paying $10K+ per funnel. Stop losing money to unmonitored campaigns.
              Let AI build it, run it, and fix it — while you focus on closing deals.
            </p>
            <Link
              href="/campaigns/new"
              className="inline-flex items-center gap-2 px-10 py-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xl rounded-xl transition-colors"
            >
              Build Your Funnel Now <ChevronRight className="w-6 h-6" />
            </Link>
            <p className="text-sm text-slate-500 mt-4">
              Takes 10 minutes to fill out. AI builds everything in under 60 seconds.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" />
            <span className="font-semibold">SOFIA</span>
            <span className="text-slate-600 text-sm ml-2">by Metric Mentor Labs</span>
          </div>
          <p className="text-sm text-slate-600">
            &copy; {new Date().getFullYear()} Metric Mentor Labs. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
