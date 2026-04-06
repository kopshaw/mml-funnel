-- ============================================================
-- Campaign Builder Schema
-- ============================================================

-- 1. CAMPAIGN BRIEFS — the full input for AI generation
CREATE TABLE campaign_briefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id),
    funnel_id UUID REFERENCES funnels(id),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'generating', 'review', 'approved', 'launched', 'archived'
    )),

    -- Brand Info
    brand_name TEXT NOT NULL,
    brand_voice TEXT,
    brand_colors JSONB DEFAULT '{}',
    brand_guidelines TEXT,
    logo_url TEXT,
    website_url TEXT,

    -- Offer Details
    offer_name TEXT NOT NULL,
    offer_description TEXT NOT NULL,
    offer_type TEXT NOT NULL CHECK (offer_type IN ('low_ticket', 'mid_ticket', 'high_ticket')),
    offer_price_cents INTEGER NOT NULL,
    offer_usps TEXT[],
    offer_deliverables TEXT[],
    offer_guarantee TEXT,

    -- Target Audience
    target_audience TEXT NOT NULL,
    target_persona TEXT,
    pain_points TEXT[],
    desired_outcomes TEXT[],
    demographics TEXT,

    -- Proof & Assets
    testimonials JSONB DEFAULT '[]',
    case_studies JSONB DEFAULT '[]',
    social_proof TEXT,
    competitor_info TEXT,

    -- Campaign Config
    traffic_source TEXT DEFAULT 'meta_ads',
    daily_budget_cents INTEGER,
    campaign_goal TEXT,
    booking_url TEXT,

    -- AI Generated Content (populated after generation)
    generated_content JSONB,
    generation_model TEXT,
    generated_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_campaign_briefs_client ON campaign_briefs(client_id);
CREATE INDEX idx_campaign_briefs_status ON campaign_briefs(status);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON campaign_briefs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. CAMPAIGN ASSETS — uploaded files (logos, images, etc.)
CREATE TABLE campaign_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_brief_id UUID NOT NULL REFERENCES campaign_briefs(id) ON DELETE CASCADE,
    asset_type TEXT NOT NULL CHECK (asset_type IN (
        'logo', 'product_image', 'hero_image', 'testimonial_image',
        'video', 'document', 'other'
    )),
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size_bytes INTEGER,
    mime_type TEXT,
    alt_text TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. EMAIL SEQUENCES — reusable email automation sequences
CREATE TABLE email_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id UUID REFERENCES funnels(id),
    client_id UUID REFERENCES clients(id),
    campaign_brief_id UUID REFERENCES campaign_briefs(id),
    name TEXT NOT NULL,
    description TEXT,
    trigger_event TEXT NOT NULL DEFAULT 'form_submission' CHECK (trigger_event IN (
        'form_submission', 'booking_made', 'no_show', 'purchase',
        'tag_added', 'manual', 'ai_qualified'
    )),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_email_sequences_funnel ON email_sequences(funnel_id);

-- 4. EMAIL SEQUENCE STEPS — individual emails in a sequence
CREATE TABLE email_sequence_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_id UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    delay_hours INTEGER NOT NULL DEFAULT 0,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    conditions JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'skipped')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(sequence_id, step_order)
);

-- 5. SMS SEQUENCES
CREATE TABLE sms_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id UUID REFERENCES funnels(id),
    client_id UUID REFERENCES clients(id),
    campaign_brief_id UUID REFERENCES campaign_briefs(id),
    name TEXT NOT NULL,
    trigger_event TEXT NOT NULL DEFAULT 'form_submission',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sms_sequence_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_id UUID NOT NULL REFERENCES sms_sequences(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    delay_hours INTEGER NOT NULL DEFAULT 0,
    message TEXT NOT NULL,
    conditions JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(sequence_id, step_order)
);

-- 6. AD CREATIVES — generated ad copy and creative briefs
CREATE TABLE ad_creatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_brief_id UUID REFERENCES campaign_briefs(id) ON DELETE CASCADE,
    funnel_id UUID REFERENCES funnels(id),
    client_id UUID REFERENCES clients(id),
    platform TEXT NOT NULL DEFAULT 'meta' CHECK (platform IN ('meta', 'google', 'linkedin', 'tiktok')),
    creative_type TEXT NOT NULL CHECK (creative_type IN ('image', 'video', 'carousel')),
    headline TEXT NOT NULL,
    primary_text TEXT NOT NULL,
    description TEXT,
    cta_text TEXT DEFAULT 'Learn More',
    image_url TEXT,
    video_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'active', 'paused')),
    performance_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ad_creatives_brief ON ad_creatives(campaign_brief_id);

-- RLS
ALTER TABLE campaign_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_creatives ENABLE ROW LEVEL SECURITY;

-- Service role full access
DO $$
DECLARE tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'campaign_briefs', 'campaign_assets', 'email_sequences',
        'email_sequence_steps', 'sms_sequences', 'sms_sequence_steps', 'ad_creatives'
    ]) LOOP
        EXECUTE format('CREATE POLICY service_all ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', tbl);
        EXECUTE format('CREATE POLICY admin_all ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl);
    END LOOP;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE campaign_briefs;
