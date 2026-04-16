import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  // Verify authentication
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Validate required fields
  if (!body.brand_name || !body.offer_name || !body.offer_description || !body.target_audience) {
    return NextResponse.json(
      { error: "Missing required fields: brand_name, offer_name, offer_description, target_audience" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data, error } = await admin.from("campaign_briefs").insert({
    brand_name: body.brand_name,
    brand_voice: body.brand_voice || null,
    brand_colors: body.brand_colors || {},
    brand_guidelines: body.brand_guidelines || null,
    website_url: body.website_url || null,
    offer_name: body.offer_name,
    offer_description: body.offer_description,
    offer_type: body.offer_type || "mid_ticket",
    offer_price_cents: body.offer_price_cents || 0,
    offer_usps: body.offer_usps || [],
    offer_deliverables: body.offer_deliverables || [],
    offer_guarantee: body.offer_guarantee || null,
    target_audience: body.target_audience,
    target_persona: body.target_persona || null,
    pain_points: body.pain_points || [],
    desired_outcomes: body.desired_outcomes || [],
    demographics: body.demographics || null,
    testimonials: body.testimonials || [],
    social_proof: body.social_proof || null,
    competitor_info: body.competitor_info || null,
    traffic_source: body.traffic_source || "meta_ads",
    daily_budget_cents: body.daily_budget_cents || null,
    campaign_goal: body.campaign_goal || null,
    booking_url: body.booking_url || null,
    client_id: body.client_id || null,
    status: "draft",
  }).select("id").single();

  if (error) {
    console.error("Failed to create campaign brief:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
