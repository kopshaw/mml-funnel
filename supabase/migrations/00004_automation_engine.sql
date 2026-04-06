-- ============================================================
-- Automation Engine: Contact Journeys + Sequence Execution
-- ============================================================

-- 1. CONTACT JOURNEYS — tracks where each contact is in each sequence
CREATE TABLE contact_journeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    funnel_id UUID NOT NULL REFERENCES funnels(id),
    client_id UUID REFERENCES clients(id),

    -- Email sequence tracking
    email_sequence_id UUID REFERENCES email_sequences(id),
    email_current_step INTEGER DEFAULT 0,
    email_next_send_at TIMESTAMPTZ,
    email_status TEXT DEFAULT 'active' CHECK (email_status IN ('active', 'paused', 'completed', 'unsubscribed')),

    -- SMS sequence tracking
    sms_sequence_id UUID REFERENCES sms_sequences(id),
    sms_current_step INTEGER DEFAULT 0,
    sms_next_send_at TIMESTAMPTZ,
    sms_status TEXT DEFAULT 'active' CHECK (sms_status IN ('active', 'paused', 'completed', 'opted_out')),

    -- Journey state
    entered_at TIMESTAMPTZ DEFAULT now(),
    last_activity_at TIMESTAMPTZ DEFAULT now(),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'converted', 'exited')),

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(contact_id, funnel_id)
);

CREATE INDEX idx_contact_journeys_email_next ON contact_journeys(email_next_send_at)
    WHERE email_status = 'active' AND email_next_send_at IS NOT NULL;
CREATE INDEX idx_contact_journeys_sms_next ON contact_journeys(sms_next_send_at)
    WHERE sms_status = 'active' AND sms_next_send_at IS NOT NULL;
CREATE INDEX idx_contact_journeys_contact ON contact_journeys(contact_id);
CREATE INDEX idx_contact_journeys_funnel ON contact_journeys(funnel_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON contact_journeys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. SEND LOG — every email/SMS actually sent, for deduplication and tracking
CREATE TABLE send_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES contacts(id),
    journey_id UUID REFERENCES contact_journeys(id),
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
    sequence_id UUID,
    step_order INTEGER,
    subject TEXT,
    body_preview TEXT,
    to_address TEXT NOT NULL,
    provider_id TEXT,
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
    sent_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_send_log_contact ON send_log(contact_id, sent_at DESC);
CREATE INDEX idx_send_log_dedup ON send_log(contact_id, sequence_id, step_order);

-- 3. META AD CAMPAIGNS — tracks campaigns we've created in Meta
CREATE TABLE meta_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id UUID REFERENCES funnels(id),
    client_id UUID REFERENCES clients(id),
    campaign_brief_id UUID REFERENCES campaign_briefs(id),
    meta_campaign_id TEXT,
    meta_adset_id TEXT,
    campaign_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'creating', 'active', 'paused', 'error')),
    daily_budget_cents INTEGER,
    targeting JSONB DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_meta_campaigns_funnel ON meta_campaigns(funnel_id);

-- RLS
ALTER TABLE contact_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE send_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_campaigns ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE tbl TEXT; BEGIN
    FOR tbl IN SELECT unnest(ARRAY['contact_journeys', 'send_log', 'meta_campaigns']) LOOP
        EXECUTE format('CREATE POLICY service_all ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', tbl);
        EXECUTE format('CREATE POLICY admin_all ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl);
    END LOOP;
END $$;
