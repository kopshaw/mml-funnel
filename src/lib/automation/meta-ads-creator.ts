import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_VERSION = "v21.0";
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

function getAccessToken(): string {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) {
    throw new Error("META_ACCESS_TOKEN environment variable is not set");
  }
  return token;
}

function getAdAccountId(): string {
  const id = process.env.META_AD_ACCOUNT_ID;
  if (!id) {
    throw new Error("META_AD_ACCOUNT_ID environment variable is not set");
  }
  return id.startsWith("act_") ? id : `act_${id}`;
}

// ---------------------------------------------------------------------------
// Meta API helper
// ---------------------------------------------------------------------------

async function metaPost<T>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<T> {
  const token = getAccessToken();
  const url = `${BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, access_token: token }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Meta API error ${response.status}: ${
        (errorData as Record<string, Record<string, string>>)?.error?.message ??
        response.statusText
      }`
    );
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Main: Create a full Meta campaign from a campaign brief
// ---------------------------------------------------------------------------

/**
 * Creates a Meta ad campaign, ad set, and individual ads from the
 * generated ad creatives attached to a campaign brief.
 *
 * Flow:
 * 1. Load brief + ad_creatives from DB
 * 2. Create a meta_campaigns record with status 'creating'
 * 3. Call Meta Marketing API to create Campaign -> AdSet -> Ads
 * 4. Store IDs and update status to 'active'
 * 5. On error: update status to 'error' with message
 */
export async function createMetaCampaign(briefId: string): Promise<string> {
  const supabase = createAdminClient();
  const accountId = getAdAccountId();

  // ── Load the brief ──────────────────────────────────────────────────────
  const { data: brief, error: briefError } = await supabase
    .from("campaign_briefs")
    .select("*")
    .eq("id", briefId)
    .single();

  if (briefError || !brief) {
    throw new Error(
      `[meta-ads-creator] Cannot load brief ${briefId}: ${briefError?.message ?? "not found"}`
    );
  }

  // ── Load ad creatives for this brief ────────────────────────────────────
  const { data: creatives, error: creativesError } = await supabase
    .from("ad_creatives")
    .select("*")
    .eq("campaign_brief_id", briefId)
    .eq("platform", "meta");

  if (creativesError || !creatives || creatives.length === 0) {
    throw new Error(
      `[meta-ads-creator] No Meta ad creatives found for brief ${briefId}`
    );
  }

  // ── Create meta_campaigns record ────────────────────────────────────────
  const { data: metaCampaign, error: mcError } = await supabase
    .from("meta_campaigns")
    .insert({
      campaign_brief_id: briefId,
      funnel_id: brief.funnel_id || null,
      client_id: (brief.client_id as string) || null,
      name: `${brief.offer_name} — Meta Campaign`,
      status: "creating",
      daily_budget_cents: (brief.daily_budget_cents as number) || 2000, // $20 default
    })
    .select()
    .single();

  if (mcError || !metaCampaign) {
    throw new Error(
      `[meta-ads-creator] Failed to create meta_campaigns record: ${mcError?.message ?? "unknown"}`
    );
  }

  const metaCampaignRecordId = metaCampaign.id as string;

  try {
    // ── Step 1: Create the Campaign on Meta ──────────────────────────────
    // Objective based on offer type: lead gen funnels use OUTCOME_LEADS,
    // purchase/sales funnels use OUTCOME_SALES
    const offerType = brief.offer_type as string;
    const objective =
      offerType === "purchase" || offerType === "product"
        ? "OUTCOME_SALES"
        : "OUTCOME_LEADS";

    const campaignResult = await metaPost<{ id: string }>(
      `/${accountId}/campaigns`,
      {
        name: `${brief.offer_name}`,
        objective,
        status: "PAUSED", // Start paused so ads can be reviewed
        special_ad_categories: [], // Set to ["HOUSING", "EMPLOYMENT", "CREDIT"] if applicable
        // buying_type: "AUCTION" — default
      }
    );

    const metaCampaignId = campaignResult.id;

    // ── Step 2: Create the Ad Set ────────────────────────────────────────
    const dailyBudget = (brief.daily_budget_cents as number) || 2000;

    const adSetResult = await metaPost<{ id: string }>(
      `/${accountId}/adsets`,
      {
        name: `${brief.offer_name} — Ad Set`,
        campaign_id: metaCampaignId,
        daily_budget: dailyBudget,
        billing_event: "IMPRESSIONS",
        optimization_goal: objective === "OUTCOME_LEADS" ? "LEAD_GENERATION" : "OFFSITE_CONVERSIONS",
        bid_strategy: "LOWEST_COST_WITHOUT_CAP",
        status: "PAUSED",

        // Targeting — these are placeholders.
        // In production, populate from brief.target_audience or client config.
        targeting: {
          // geo_locations: { countries: ["US"] },
          // age_min: 25,
          // age_max: 65,
          // Custom audiences, interests, behaviors go here
          // e.g. interests: [{ id: "6003139266461", name: "Fitness" }]
        },

        // Scheduling — start immediately, no end date
        // start_time: new Date().toISOString(),
      }
    );

    const metaAdsetId = adSetResult.id;

    // ── Step 3: Create an Ad for each creative ───────────────────────────
    const adIds: string[] = [];

    for (const creative of creatives) {
      try {
        // First, create the ad creative object on Meta
        const creativeResult = await metaPost<{ id: string }>(
          `/${accountId}/adcreatives`,
          {
            name: `${creative.headline} — Creative`,
            object_story_spec: {
              // page_id is required — would come from client config
              // page_id: "YOUR_PAGE_ID",
              link_data: {
                // image_hash or image_url would go here for image ads
                // image_hash: "abc123",
                link: `https://metricmentorlabs.com/l/${brief.funnel_id || "landing"}`,
                message: creative.primary_text,
                name: creative.headline,
                description: creative.description,
                call_to_action: {
                  type: mapCTAType(creative.cta_text as string),
                  // value: { link: "..." }
                },
              },
            },
          }
        );

        // Then create the ad itself
        const adResult = await metaPost<{ id: string }>(
          `/${accountId}/ads`,
          {
            name: creative.headline as string,
            adset_id: metaAdsetId,
            creative: { creative_id: creativeResult.id },
            status: "PAUSED",
          }
        );

        adIds.push(adResult.id);

        // Update the ad_creative record with the Meta ad ID
        await supabase
          .from("ad_creatives")
          .update({
            meta_ad_id: adResult.id,
            meta_creative_id: creativeResult.id,
            status: "active",
          })
          .eq("id", creative.id as string);
      } catch (adErr) {
        // Log per-creative errors but continue creating the rest
        const msg = adErr instanceof Error ? adErr.message : String(adErr);
        console.error(
          `[meta-ads-creator] Failed to create ad for creative ${creative.id}:`,
          msg
        );
      }
    }

    // ── Step 4: Update meta_campaigns record with Meta IDs ───────────────
    await supabase
      .from("meta_campaigns")
      .update({
        meta_campaign_id: metaCampaignId,
        meta_adset_id: metaAdsetId,
        meta_ad_ids: adIds,
        status: "active",
      })
      .eq("id", metaCampaignRecordId);

    return metaCampaignRecordId;
  } catch (err) {
    // Something failed during Meta API calls — record the error
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[meta-ads-creator] Campaign creation failed:`, message);

    await supabase
      .from("meta_campaigns")
      .update({
        status: "error",
        error_message: message,
      })
      .eq("id", metaCampaignRecordId);

    throw err;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map a human-readable CTA string to a Meta API call-to-action type.
 */
function mapCTAType(ctaText: string): string {
  const lower = (ctaText || "").toLowerCase();

  if (lower.includes("book") || lower.includes("schedule")) return "BOOK_NOW";
  if (lower.includes("sign up") || lower.includes("register")) return "SIGN_UP";
  if (lower.includes("learn")) return "LEARN_MORE";
  if (lower.includes("shop") || lower.includes("buy")) return "SHOP_NOW";
  if (lower.includes("download")) return "DOWNLOAD";
  if (lower.includes("get offer") || lower.includes("claim")) return "GET_OFFER";
  if (lower.includes("contact")) return "CONTACT_US";
  if (lower.includes("apply")) return "APPLY_NOW";
  if (lower.includes("subscribe")) return "SUBSCRIBE";

  // Default fallback
  return "LEARN_MORE";
}
