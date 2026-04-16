import { createAdminClient } from "@/lib/supabase/admin";
import type { GeneratedCampaignContent } from "@/lib/ai/campaign-architect";
import { enrollContact } from "@/lib/automation/journey-manager";
import { createMetaCampaign } from "@/lib/automation/meta-ads-creator";

// Re-export enrollContact so form-submission handlers can import from here
// without needing to know about the automation layer directly.
export { enrollContact };

// ---------------------------------------------------------------------------
// Main Launch Function
// ---------------------------------------------------------------------------

/**
 * Take an approved campaign brief and deploy all generated content
 * into the live system — creating the funnel, stages, sequences,
 * ad creatives, and everything needed to go live.
 */
export async function launchCampaign(briefId: string): Promise<string> {
  const supabase = createAdminClient();

  // ── 1. Load the brief and generated content ────────────────────────────
  const { data: brief, error: loadError } = await supabase
    .from("campaign_briefs")
    .select("*")
    .eq("id", briefId)
    .single();

  if (loadError || !brief) {
    throw new Error(
      `Failed to load campaign brief ${briefId}: ${loadError?.message || "not found"}`
    );
  }

  if (brief.status !== "approved" && brief.status !== "review") {
    throw new Error(
      `Brief ${briefId} is in '${brief.status}' status — only 'approved' or 'review' briefs can be launched`
    );
  }

  const content = brief.generated_content as GeneratedCampaignContent | null;
  if (!content) {
    throw new Error(
      `Brief ${briefId} has no generated content — run generation first`
    );
  }

  // ── 2. Create the funnel ───────────────────────────────────────────────
  const landingSlug = slugify(brief.offer_name as string);

  const { data: funnel, error: funnelError } = await supabase
    .from("funnels")
    .insert({
      name: brief.offer_name as string,
      description: brief.offer_description as string,
      offer_type: brief.offer_type as string,
      offer_price_cents: brief.offer_price_cents as number,
      status: "active",
      client_id: brief.client_id as string | null,
      landing_page_slug: landingSlug,
    })
    .select()
    .single();

  if (funnelError || !funnel) {
    throw new Error(
      `Failed to create funnel: ${funnelError?.message || "unknown error"}`
    );
  }

  const funnelId = funnel.id as string;

  try {
    // ── 3. Create funnel stages ────────────────────────────────────────────
    const stageInserts = content.funnel_stages.map((stage) => ({
      funnel_id: funnelId,
      stage_name: stage.stage_name,
      stage_type: stage.stage_type,
      stage_order: stage.stage_order,
    }));

    const { data: createdStages, error: stagesError } = await supabase
      .from("funnel_stages")
      .insert(stageInserts)
      .select();

    if (stagesError || !createdStages) {
      throw new Error(
        `Failed to create funnel stages: ${stagesError?.message || "no data returned"}`
      );
    }

    // ── 4. Create stage baselines ──────────────────────────────────────────
    const baselineInserts = createdStages.map((dbStage) => {
      const generatedStage = content.funnel_stages.find(
        (gs) => gs.stage_order === dbStage.stage_order
      );

      return {
        funnel_stage_id: dbStage.id as string,
        metric_name: "conversion_rate",
        baseline_value: generatedStage?.baseline_value ?? 0.05,
        warning_threshold: generatedStage?.warning_threshold ?? 0.035,
        critical_threshold: generatedStage?.critical_threshold ?? 0.025,
        lookback_window_hours: 24,
        minimum_sample_size: 50,
      };
    });

    const { error: baselinesError } = await supabase
      .from("stage_baselines")
      .insert(baselineInserts);

    if (baselinesError) {
      throw new Error(
        `Failed to create stage baselines: ${baselinesError.message}`
      );
    }

    // ── 5. Create email sequence ───────────────────────────────────────────
    const { data: emailSeq, error: emailSeqError } = await supabase
      .from("email_sequences")
      .insert({
        funnel_id: funnelId,
        client_id: (brief.client_id as string) || null,
        campaign_brief_id: briefId,
        name: `${brief.offer_name} — Nurture Sequence`,
        description: `Auto-generated ${content.email_sequence.length}-email sequence for ${brief.offer_name}`,
        trigger_event: "form_submission",
        status: "active",
      })
      .select()
      .single();

    if (emailSeqError || !emailSeq) {
      throw new Error(
        `Failed to create email sequence: ${emailSeqError?.message || "unknown error"}`
      );
    }

    const emailStepInserts = content.email_sequence.map((step) => ({
      sequence_id: emailSeq.id as string,
      step_order: step.step_order,
      delay_hours: step.delay_hours,
      subject: step.subject,
      body_html: step.body_html,
      body_text: step.body_text,
      status: "active" as const,
    }));

    const { error: emailStepsError } = await supabase
      .from("email_sequence_steps")
      .insert(emailStepInserts);

    if (emailStepsError) {
      throw new Error(
        `Failed to create email steps: ${emailStepsError.message}`
      );
    }

    // ── 6. Create SMS sequence ─────────────────────────────────────────────
    const { data: smsSeq, error: smsSeqError } = await supabase
      .from("sms_sequences")
      .insert({
        funnel_id: funnelId,
        client_id: (brief.client_id as string) || null,
        campaign_brief_id: briefId,
        name: `${brief.offer_name} — SMS Follow-up`,
        trigger_event: "form_submission",
        status: "active",
      })
      .select()
      .single();

    if (smsSeqError || !smsSeq) {
      throw new Error(
        `Failed to create SMS sequence: ${smsSeqError?.message || "unknown error"}`
      );
    }

    const smsStepInserts = content.sms_sequence.map((step) => ({
      sequence_id: smsSeq.id as string,
      step_order: step.step_order,
      delay_hours: step.delay_hours,
      message: step.message,
      status: "active" as const,
    }));

    const { error: smsStepsError } = await supabase
      .from("sms_sequence_steps")
      .insert(smsStepInserts);

    if (smsStepsError) {
      throw new Error(
        `Failed to create SMS steps: ${smsStepsError.message}`
      );
    }

    // ── 7. Create ad creatives ─────────────────────────────────────────────
    const adInserts = content.ad_creatives.map((ad) => ({
      campaign_brief_id: briefId,
      funnel_id: funnelId,
      client_id: (brief.client_id as string) || null,
      platform: (brief.traffic_source as string) === "google_ads" ? "google" : "meta",
      creative_type: ad.creative_type,
      headline: ad.headline,
      primary_text: ad.primary_text,
      description: ad.description,
      cta_text: ad.cta_text,
      status: "draft" as const,
    }));

    const { error: adsError } = await supabase
      .from("ad_creatives")
      .insert(adInserts);

    if (adsError) {
      throw new Error(`Failed to create ad creatives: ${adsError.message}`);
    }

    // ── 7a. Create A/B test for the landing page (long vs short variants) ──
    const generatedV2 = content as unknown as {
      landing_page_long?: unknown;
      landing_page_short?: unknown;
    };

    if (generatedV2.landing_page_long && generatedV2.landing_page_short) {
      // Find the page_view stage to attach the test to
      const pageViewStage = createdStages.find(
        (s) => (s.stage_type as string) === "page_view" || (s.stage_type as string) === "page_conversion"
      );

      if (pageViewStage) {
        const { data: abTest, error: abTestError } = await supabase
          .from("ab_tests")
          .insert({
            funnel_id: funnelId,
            funnel_stage_id: pageViewStage.id as string,
            test_name: `Landing Page: Long-form vs Short-form`,
            test_type: "landing_page",
            status: "running",
            min_sample_per_variant: 100,
            confidence_threshold: 0.95,
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (abTestError || !abTest) {
          console.warn(
            `[campaign-launcher] Failed to create A/B test (non-fatal):`,
            abTestError?.message
          );
        } else {
          // Insert both variants
          const { error: variantsError } = await supabase
            .from("ab_test_variants")
            .insert([
              {
                ab_test_id: abTest.id as string,
                variant_label: "Long-form",
                variant_content: { variant: "long", page: generatedV2.landing_page_long },
                is_control: true,
                traffic_percentage: 50,
              },
              {
                ab_test_id: abTest.id as string,
                variant_label: "Short-form",
                variant_content: { variant: "short", page: generatedV2.landing_page_short },
                is_control: false,
                traffic_percentage: 50,
              },
            ]);

          if (variantsError) {
            console.warn(
              `[campaign-launcher] Failed to insert A/B variants (non-fatal):`,
              variantsError.message
            );
          }
        }
      }
    }

    // ── 7b. Create Meta ad campaign (non-blocking) ────────────────────────
    // Don't fail the launch if Meta campaign creation fails — the ads can
    // be created later manually or via retry.
    try {
      await createMetaCampaign(briefId);
    } catch (metaErr) {
      console.warn(
        `[campaign-launcher] Meta campaign creation failed (non-fatal):`,
        metaErr instanceof Error ? metaErr.message : String(metaErr)
      );
    }

    // ── 8. Update brief — mark as launched ─────────────────────────────────
    const { error: updateError } = await supabase
      .from("campaign_briefs")
      .update({
        status: "launched",
        funnel_id: funnelId,
      })
      .eq("id", briefId);

    if (updateError) {
      throw new Error(
        `Failed to update brief status to launched: ${updateError.message}`
      );
    }

    // ── 9. Create launch alert ─────────────────────────────────────────────
    await supabase.from("alerts").insert({
      funnel_id: funnelId,
      client_id: (brief.client_id as string) || null,
      severity: "info",
      title: `Campaign launched: ${brief.offer_name}`,
      message: [
        `Funnel "${brief.offer_name}" is now live.`,
        `${content.funnel_stages.length} stages created.`,
        `${content.email_sequence.length}-email nurture sequence active.`,
        `${content.sms_sequence.length} SMS follow-ups active.`,
        `${content.ad_creatives.length} ad creatives ready for review.`,
        `Landing page slug: /${landingSlug}`,
      ].join(" "),
    });

    return funnelId;
  } catch (err) {
    // If anything fails mid-launch, clean up the funnel to avoid orphans.
    // The cascade deletes on funnel_stages will remove baselines too.
    await supabase.from("funnels").delete().eq("id", funnelId);

    // Also revert brief status
    await supabase
      .from("campaign_briefs")
      .update({ status: "approved" })
      .eq("id", briefId);

    throw err;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
