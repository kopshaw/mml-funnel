import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Campaign Command Center — full data for the detail page + mind map
// ---------------------------------------------------------------------------

export interface CampaignNode {
  id: string;                   // unique node id
  kind:
    | "campaign"
    | "ad"
    | "landing_variant"
    | "email_step"
    | "sms_step"
    | "ai_agent"
    | "pipeline_stage"
    | "booking";
  label: string;                // display name
  subLabel?: string;            // smaller subtitle
  metrics?: NodeMetrics;
  data?: Record<string, unknown>; // underlying row (full content)
  parent_id?: string;           // tree structure
  order?: number;                // ordering within a group
}

export interface NodeMetrics {
  // Common — different for each node kind
  primary_label?: string;
  primary_value?: string;
  secondary_label?: string;
  secondary_value?: string;
  tertiary_label?: string;
  tertiary_value?: string;
  conversion_rate?: number;    // 0.0-1.0
  health?: "healthy" | "warning" | "critical" | "inactive";
}

export interface CampaignEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  /** Volume flowing through this edge (for thickness) */
  volume?: number;
}

export interface OptimizationHistoryEntry {
  id: string;
  node_id: string;              // which node this applies to
  action_type: string;
  risk_tier: string;
  status: string;
  diagnosis: string;
  impact_verdict?: string;
  impact_delta?: number;
  created_at: string;
  executed_at?: string | null;
}

export interface CampaignDetail {
  brief: {
    id: string;
    status: string;
    brand_name: string;
    offer_name: string;
    offer_description: string | null;
    offer_type: string;
    offer_price_cents: number;
    generated_content: unknown;
    funnel_id: string | null;
    created_at: string;
  };
  funnel: {
    id: string;
    name: string;
    status: string;
    landing_page_slug: string | null;
    created_at: string;
  } | null;
  kpis: {
    total_leads: number;
    total_conversions: number;
    total_revenue_cents: number;
    total_ad_spend_cents: number;
    roas: number | null;
    conversion_rate: number | null;
  };
  nodes: CampaignNode[];
  edges: CampaignEdge[];
  history_by_node: Record<string, OptimizationHistoryEntry[]>;
}

// ---------------------------------------------------------------------------
// Main loader
// ---------------------------------------------------------------------------

export async function getCampaignDetail(briefId: string): Promise<CampaignDetail | null> {
  const supabase = createAdminClient();

  // Load brief
  const { data: brief, error: briefError } = await supabase
    .from("campaign_briefs")
    .select("*")
    .eq("id", briefId)
    .single();

  if (briefError || !brief) return null;

  const funnelId = brief.funnel_id as string | null;
  let funnel: CampaignDetail["funnel"] = null;

  if (funnelId) {
    const { data: f } = await supabase
      .from("funnels")
      .select("id, name, status, landing_page_slug, created_at")
      .eq("id", funnelId)
      .single();
    funnel = f as CampaignDetail["funnel"];
  }

  // Parallel-load all the related data
  const [
    stagesResult,
    emailSeqResult,
    smsSeqResult,
    adsResult,
    abVariantsResult,
    contactsResult,
    eventsResult,
    actionsResult,
    metricsResult,
    sendLogResult,
  ] = await Promise.all([
    funnelId
      ? supabase
          .from("funnel_stages")
          .select("id, stage_name, stage_type, stage_order")
          .eq("funnel_id", funnelId)
          .order("stage_order")
      : { data: [], error: null },
    funnelId
      ? supabase
          .from("email_sequences")
          .select("id, name, email_sequence_steps(id, step_order, subject, delay_hours, body_html, body_text)")
          .eq("funnel_id", funnelId)
      : { data: [], error: null },
    funnelId
      ? supabase
          .from("sms_sequences")
          .select("id, name, sms_sequence_steps(id, step_order, delay_hours, message)")
          .eq("funnel_id", funnelId)
      : { data: [], error: null },
    funnelId
      ? supabase
          .from("ad_creatives")
          .select("id, headline, primary_text, description, cta_text, platform, status")
          .eq("funnel_id", funnelId)
      : { data: [], error: null },
    funnelId
      ? supabase
          .from("ab_tests")
          .select("id, test_type, ab_test_variants(id, variant_label, variant_content, impressions, conversions, conversion_rate)")
          .eq("funnel_id", funnelId)
      : { data: [], error: null },
    funnelId
      ? supabase
          .from("contacts")
          .select("id, qualification_status")
          .eq("source_funnel_id", funnelId)
      : { data: [], error: null },
    funnelId
      ? supabase
          .from("pipeline_events")
          .select("event_type, event_data, funnel_stage_id, occurred_at")
          .eq("funnel_id", funnelId)
      : { data: [], error: null },
    funnelId
      ? supabase
          .from("optimization_actions")
          .select("id, action_type, action_details, risk_tier, status, diagnosis, impact_verdict, impact_delta, funnel_stage_id, created_at, executed_at")
          .eq("funnel_id", funnelId)
          .order("created_at", { ascending: false })
      : { data: [], error: null },
    funnelId
      ? supabase
          .from("ad_metrics")
          .select("ad_creative_id, impressions, clicks, spend_cents, ctr, cpc, cpl")
      : { data: [], error: null },
    funnelId
      ? supabase
          .from("send_log")
          .select("sequence_step_id, channel, status")
      : { data: [], error: null },
  ]);

  const stages = (stagesResult.data ?? []) as Array<{ id: string; stage_name: string; stage_type: string; stage_order: number }>;
  const emailSequences = (emailSeqResult.data ?? []) as Array<{ id: string; name: string; email_sequence_steps: Array<{ id: string; step_order: number; subject: string; delay_hours: number; body_html?: string; body_text?: string }> }>;
  const smsSequences = (smsSeqResult.data ?? []) as Array<{ id: string; name: string; sms_sequence_steps: Array<{ id: string; step_order: number; delay_hours: number; message: string }> }>;
  const ads = (adsResult.data ?? []) as Array<{ id: string; headline: string; primary_text: string; description?: string; cta_text?: string; platform?: string; status?: string }>;
  const abTests = (abVariantsResult.data ?? []) as Array<{ id: string; test_type: string; ab_test_variants: Array<{ id: string; variant_label: string; variant_content: unknown; impressions: number; conversions: number; conversion_rate: number }> }>;
  const contacts = (contactsResult.data ?? []) as Array<{ id: string; qualification_status: string | null }>;
  const events = (eventsResult.data ?? []) as Array<{ event_type: string; event_data: unknown; funnel_stage_id: string | null; occurred_at: string }>;
  const actions = (actionsResult.data ?? []) as Array<{ id: string; action_type: string; action_details: unknown; risk_tier: string; status: string; diagnosis: string; impact_verdict?: string; impact_delta?: number; funnel_stage_id: string | null; created_at: string; executed_at?: string | null }>;
  const adMetrics = (metricsResult.data ?? []) as Array<{ ad_creative_id: string; impressions: number; clicks: number; spend_cents: number; ctr?: number; cpc?: number; cpl?: number }>;
  const sendLog = (sendLogResult.data ?? []) as Array<{ sequence_step_id: string; channel: string; status: string }>;

  // Aggregate metrics lookups
  const adStats: Record<string, { impressions: number; clicks: number; spend_cents: number }> = {};
  for (const m of adMetrics) {
    if (!adStats[m.ad_creative_id]) adStats[m.ad_creative_id] = { impressions: 0, clicks: 0, spend_cents: 0 };
    adStats[m.ad_creative_id].impressions += m.impressions ?? 0;
    adStats[m.ad_creative_id].clicks += m.clicks ?? 0;
    adStats[m.ad_creative_id].spend_cents += m.spend_cents ?? 0;
  }

  const emailSendStats: Record<string, { sent: number; delivered: number; opened: number; clicked: number }> = {};
  const smsSendStats: Record<string, { sent: number; delivered: number; replied: number }> = {};
  for (const s of sendLog) {
    if (s.channel === "email") {
      if (!emailSendStats[s.sequence_step_id]) emailSendStats[s.sequence_step_id] = { sent: 0, delivered: 0, opened: 0, clicked: 0 };
      emailSendStats[s.sequence_step_id].sent++;
      if (s.status === "delivered") emailSendStats[s.sequence_step_id].delivered++;
      if (s.status === "opened") emailSendStats[s.sequence_step_id].opened++;
      if (s.status === "clicked") emailSendStats[s.sequence_step_id].clicked++;
    } else if (s.channel === "sms") {
      if (!smsSendStats[s.sequence_step_id]) smsSendStats[s.sequence_step_id] = { sent: 0, delivered: 0, replied: 0 };
      smsSendStats[s.sequence_step_id].sent++;
      if (s.status === "delivered") smsSendStats[s.sequence_step_id].delivered++;
      if (s.status === "replied") smsSendStats[s.sequence_step_id].replied++;
    }
  }

  const stageEventCounts: Record<string, number> = {};
  for (const e of events) {
    if (e.funnel_stage_id) {
      stageEventCounts[e.funnel_stage_id] = (stageEventCounts[e.funnel_stage_id] ?? 0) + 1;
    }
  }

  const closedWonEvents = events.filter((e) => e.event_type === "closed_won");
  const totalRevenueCents = closedWonEvents.reduce((sum, e) => {
    const d = e.event_data as { amount_cents?: number } | null;
    return sum + (d?.amount_cents ?? 0);
  }, 0);
  const totalAdSpendCents = Object.values(adStats).reduce((s, a) => s + a.spend_cents, 0);
  const totalConversions = closedWonEvents.length;
  const totalLeads = contacts.length;

  // ─────────────────────────────────────────────────────────────────────
  // Build nodes + edges
  // ─────────────────────────────────────────────────────────────────────

  const nodes: CampaignNode[] = [];
  const edges: CampaignEdge[] = [];

  const CAMPAIGN_ID = `campaign:${brief.id}`;

  // Root: campaign
  nodes.push({
    id: CAMPAIGN_ID,
    kind: "campaign",
    label: brief.offer_name as string,
    subLabel: brief.brand_name as string,
    metrics: {
      primary_label: "Revenue",
      primary_value: `$${(totalRevenueCents / 100).toLocaleString()}`,
      secondary_label: "Leads",
      secondary_value: totalLeads.toLocaleString(),
      tertiary_label: "ROAS",
      tertiary_value:
        totalAdSpendCents > 0
          ? `${(totalRevenueCents / totalAdSpendCents).toFixed(2)}x`
          : "—",
      health: funnel?.status === "active" ? "healthy" : "inactive",
    },
    data: {
      brief,
      funnel,
    },
  });

  // Ads
  for (const ad of ads) {
    const stats = adStats[ad.id] ?? { impressions: 0, clicks: 0, spend_cents: 0 };
    const ctr = stats.impressions > 0 ? stats.clicks / stats.impressions : 0;
    const nodeId = `ad:${ad.id}`;
    nodes.push({
      id: nodeId,
      kind: "ad",
      label: ad.headline,
      subLabel: `${ad.platform ?? "meta"} • ${ad.status ?? "draft"}`,
      metrics: {
        primary_label: "Impressions",
        primary_value: stats.impressions.toLocaleString(),
        secondary_label: "Clicks",
        secondary_value: stats.clicks.toLocaleString(),
        tertiary_label: "CTR",
        tertiary_value: `${(ctr * 100).toFixed(2)}%`,
        conversion_rate: ctr,
        health: stats.impressions === 0 ? "inactive" : ctr >= 0.02 ? "healthy" : ctr >= 0.01 ? "warning" : "critical",
      },
      data: ad,
      parent_id: CAMPAIGN_ID,
    });
    edges.push({
      id: `e:${CAMPAIGN_ID}->${nodeId}`,
      source: CAMPAIGN_ID,
      target: nodeId,
      volume: stats.clicks,
    });
  }

  // Landing variants (from AB tests)
  const landingTest = abTests.find((t) => t.test_type === "landing_page");
  if (landingTest?.ab_test_variants) {
    for (const v of landingTest.ab_test_variants) {
      const nodeId = `landing:${v.id}`;
      const convRate = v.conversion_rate ?? 0;
      nodes.push({
        id: nodeId,
        kind: "landing_variant",
        label: `${v.variant_label} landing page`,
        subLabel: `${v.impressions} visits • ${v.conversions} opt-ins`,
        metrics: {
          primary_label: "Visits",
          primary_value: (v.impressions ?? 0).toLocaleString(),
          secondary_label: "Opt-ins",
          secondary_value: (v.conversions ?? 0).toLocaleString(),
          tertiary_label: "Conv. Rate",
          tertiary_value: `${((convRate ?? 0) * 100).toFixed(2)}%`,
          conversion_rate: convRate,
          health: v.impressions === 0 ? "inactive" : convRate >= 0.15 ? "healthy" : convRate >= 0.08 ? "warning" : "critical",
        },
        data: v,
        parent_id: CAMPAIGN_ID,
      });
      edges.push({ id: `e:${CAMPAIGN_ID}->${nodeId}`, source: CAMPAIGN_ID, target: nodeId, volume: v.impressions });
    }
  }

  // Email sequence steps
  const allEmailSteps = emailSequences.flatMap((seq) => seq.email_sequence_steps ?? []);
  allEmailSteps.sort((a, b) => a.step_order - b.step_order);
  for (const step of allEmailSteps) {
    const stats = emailSendStats[step.id] ?? { sent: 0, delivered: 0, opened: 0, clicked: 0 };
    const openRate = stats.sent > 0 ? stats.opened / stats.sent : 0;
    const nodeId = `email:${step.id}`;
    nodes.push({
      id: nodeId,
      kind: "email_step",
      label: `Email ${step.step_order}: ${step.subject}`,
      subLabel: step.delay_hours === 0 ? "Immediate" : `+${step.delay_hours}h`,
      metrics: {
        primary_label: "Sent",
        primary_value: stats.sent.toLocaleString(),
        secondary_label: "Opened",
        secondary_value: `${stats.opened} (${(openRate * 100).toFixed(0)}%)`,
        tertiary_label: "Clicked",
        tertiary_value: stats.clicked.toLocaleString(),
        conversion_rate: openRate,
        health: stats.sent === 0 ? "inactive" : openRate >= 0.3 ? "healthy" : openRate >= 0.2 ? "warning" : "critical",
      },
      data: step,
      parent_id: CAMPAIGN_ID,
      order: step.step_order,
    });
    edges.push({ id: `e:${CAMPAIGN_ID}->${nodeId}`, source: CAMPAIGN_ID, target: nodeId, volume: stats.sent });
  }

  // SMS steps
  const allSmsSteps = smsSequences.flatMap((seq) => seq.sms_sequence_steps ?? []);
  allSmsSteps.sort((a, b) => a.step_order - b.step_order);
  for (const step of allSmsSteps) {
    const stats = smsSendStats[step.id] ?? { sent: 0, delivered: 0, replied: 0 };
    const replyRate = stats.sent > 0 ? stats.replied / stats.sent : 0;
    const nodeId = `sms:${step.id}`;
    nodes.push({
      id: nodeId,
      kind: "sms_step",
      label: `SMS ${step.step_order}`,
      subLabel: step.delay_hours < 1 ? `+${Math.round(step.delay_hours * 60)}min` : `+${step.delay_hours}h`,
      metrics: {
        primary_label: "Sent",
        primary_value: stats.sent.toLocaleString(),
        secondary_label: "Delivered",
        secondary_value: stats.delivered.toLocaleString(),
        tertiary_label: "Replies",
        tertiary_value: `${stats.replied} (${(replyRate * 100).toFixed(0)}%)`,
        conversion_rate: replyRate,
        health: stats.sent === 0 ? "inactive" : replyRate >= 0.1 ? "healthy" : replyRate >= 0.05 ? "warning" : "critical",
      },
      data: step,
      parent_id: CAMPAIGN_ID,
      order: step.step_order,
    });
    edges.push({ id: `e:${CAMPAIGN_ID}->${nodeId}`, source: CAMPAIGN_ID, target: nodeId, volume: stats.sent });
  }

  // AI sales agent
  const qualifiedContacts = contacts.filter((c) => c.qualification_status === "qualified").length;
  const bookedContacts = contacts.filter((c) => c.qualification_status === "booked").length;
  nodes.push({
    id: `agent:${brief.id}`,
    kind: "ai_agent",
    label: "AI Sales Agent",
    subLabel: `${qualifiedContacts} qualified / ${bookedContacts} booked`,
    metrics: {
      primary_label: "Conversations",
      primary_value: totalLeads.toLocaleString(),
      secondary_label: "Qualified",
      secondary_value: qualifiedContacts.toLocaleString(),
      tertiary_label: "Booked",
      tertiary_value: bookedContacts.toLocaleString(),
      conversion_rate: totalLeads > 0 ? qualifiedContacts / totalLeads : 0,
      health: totalLeads === 0 ? "inactive" : qualifiedContacts / Math.max(totalLeads, 1) >= 0.3 ? "healthy" : "warning",
    },
    data: { contacts_count: totalLeads },
    parent_id: CAMPAIGN_ID,
  });
  edges.push({ id: `e:${CAMPAIGN_ID}->agent:${brief.id}`, source: CAMPAIGN_ID, target: `agent:${brief.id}`, volume: totalLeads });

  // Pipeline stages
  for (const stage of stages) {
    const count = stageEventCounts[stage.id] ?? 0;
    const nodeId = `stage:${stage.id}`;
    nodes.push({
      id: nodeId,
      kind: "pipeline_stage",
      label: stage.stage_name,
      subLabel: `Stage ${stage.stage_order}`,
      metrics: {
        primary_label: "Events",
        primary_value: count.toLocaleString(),
        health: count === 0 ? "inactive" : "healthy",
      },
      data: stage,
      parent_id: CAMPAIGN_ID,
      order: stage.stage_order,
    });
    edges.push({ id: `e:${CAMPAIGN_ID}->${nodeId}`, source: CAMPAIGN_ID, target: nodeId, volume: count });
  }

  // Booking / checkout node (placeholder until booking platform is wired)
  nodes.push({
    id: `booking:${brief.id}`,
    kind: "booking",
    label: "Booking / Checkout",
    subLabel: "Calendly + Stripe",
    metrics: {
      primary_label: "Booked",
      primary_value: bookedContacts.toLocaleString(),
      secondary_label: "Closed",
      secondary_value: totalConversions.toLocaleString(),
      tertiary_label: "Revenue",
      tertiary_value: `$${(totalRevenueCents / 100).toLocaleString()}`,
      health: totalConversions > 0 ? "healthy" : bookedContacts > 0 ? "warning" : "inactive",
    },
    data: { booking_count: bookedContacts, closed_won: totalConversions },
    parent_id: CAMPAIGN_ID,
  });
  edges.push({ id: `e:${CAMPAIGN_ID}->booking:${brief.id}`, source: CAMPAIGN_ID, target: `booking:${brief.id}`, volume: bookedContacts });

  // ─────────────────────────────────────────────────────────────────────
  // Map optimization actions to nodes
  // ─────────────────────────────────────────────────────────────────────

  const historyByNode: Record<string, OptimizationHistoryEntry[]> = {};
  for (const action of actions) {
    // Figure out which node this action touched based on action_type + details
    const details = (action.action_details ?? {}) as {
      step_id?: string;
      variant_id?: string;
      ad_id?: string;
      adset_id?: string;
    };
    const targetNodeIds: string[] = [];

    if (action.funnel_stage_id) {
      targetNodeIds.push(`stage:${action.funnel_stage_id}`);
    }
    if (details.step_id) {
      // Could be email or sms
      const isEmail = allEmailSteps.some((s) => s.id === details.step_id);
      targetNodeIds.push(isEmail ? `email:${details.step_id}` : `sms:${details.step_id}`);
    }
    if (details.variant_id) {
      targetNodeIds.push(`landing:${details.variant_id}`);
    }
    if (details.ad_id) {
      targetNodeIds.push(`ad:${details.ad_id}`);
    }
    if (targetNodeIds.length === 0) {
      targetNodeIds.push(CAMPAIGN_ID);
    }

    const entry: OptimizationHistoryEntry = {
      id: action.id,
      node_id: targetNodeIds[0],
      action_type: action.action_type,
      risk_tier: action.risk_tier,
      status: action.status,
      diagnosis: action.diagnosis,
      impact_verdict: action.impact_verdict,
      impact_delta: action.impact_delta,
      created_at: action.created_at,
      executed_at: action.executed_at,
    };

    for (const nid of targetNodeIds) {
      if (!historyByNode[nid]) historyByNode[nid] = [];
      historyByNode[nid].push(entry);
    }
  }

  return {
    brief: {
      id: brief.id as string,
      status: brief.status as string,
      brand_name: brief.brand_name as string,
      offer_name: brief.offer_name as string,
      offer_description: (brief.offer_description as string) ?? null,
      offer_type: brief.offer_type as string,
      offer_price_cents: brief.offer_price_cents as number,
      generated_content: brief.generated_content,
      funnel_id: brief.funnel_id as string | null,
      created_at: brief.created_at as string,
    },
    funnel,
    kpis: {
      total_leads: totalLeads,
      total_conversions: totalConversions,
      total_revenue_cents: totalRevenueCents,
      total_ad_spend_cents: totalAdSpendCents,
      roas: totalAdSpendCents > 0 ? totalRevenueCents / totalAdSpendCents : null,
      conversion_rate: totalLeads > 0 ? totalConversions / totalLeads : null,
    },
    nodes,
    edges,
    history_by_node: historyByNode,
  };
}
