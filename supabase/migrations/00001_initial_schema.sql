-- ============================================================
-- MML Self-Healing Funnel System — Initial Schema
-- ============================================================

-- 1. FUNNELS
CREATE TABLE funnels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    offer_type TEXT NOT NULL CHECK (offer_type IN ('low_ticket', 'mid_ticket', 'high_ticket')),
    offer_price_cents INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    ghl_pipeline_id TEXT,
    meta_campaign_ids TEXT[],
    landing_page_slug TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. FUNNEL STAGES
CREATE TABLE funnel_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
    stage_type TEXT NOT NULL CHECK (stage_type IN (
        'ad_impression', 'ad_click', 'page_view', 'page_conversion',
        'email_sent', 'email_opened', 'email_clicked',
        'sms_sent', 'sms_replied',
        'ai_conversation', 'qualified', 'booking_made',
        'booking_attended', 'proposal_sent', 'closed_won', 'closed_lost'
    )),
    stage_order INTEGER NOT NULL,
    stage_name TEXT NOT NULL,
    ghl_resource_id TEXT,
    meta_adset_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(funnel_id, stage_order)
);

-- 3. STAGE BASELINES
CREATE TABLE stage_baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_stage_id UUID NOT NULL REFERENCES funnel_stages(id) ON DELETE CASCADE,
    metric_name TEXT NOT NULL,
    baseline_value NUMERIC NOT NULL,
    warning_threshold NUMERIC NOT NULL,
    critical_threshold NUMERIC NOT NULL,
    lookback_window_hours INTEGER NOT NULL DEFAULT 24,
    minimum_sample_size INTEGER NOT NULL DEFAULT 50,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(funnel_stage_id, metric_name)
);

-- 4. CONTACTS
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ghl_contact_id TEXT UNIQUE,
    email TEXT,
    phone TEXT,
    first_name TEXT,
    last_name TEXT,
    source TEXT,
    source_campaign_id TEXT,
    source_adset_id TEXT,
    source_ad_id TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    utm_term TEXT,
    lead_score INTEGER DEFAULT 0,
    qualification_status TEXT DEFAULT 'unknown' CHECK (qualification_status IN (
        'unknown', 'unqualified', 'nurturing', 'qualified', 'booked', 'closed_won', 'closed_lost'
    )),
    offer_type TEXT,
    funnel_id UUID REFERENCES funnels(id),
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',
    ghl_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE INDEX idx_contacts_ghl_id ON contacts(ghl_contact_id);
CREATE INDEX idx_contacts_qualification ON contacts(qualification_status);
CREATE INDEX idx_contacts_funnel ON contacts(funnel_id);

-- 5. PIPELINE EVENTS
CREATE TABLE pipeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    funnel_id UUID REFERENCES funnels(id),
    funnel_stage_id UUID REFERENCES funnel_stages(id),
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    ghl_event_id TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pipeline_events_contact ON pipeline_events(contact_id, occurred_at DESC);
CREATE INDEX idx_pipeline_events_funnel_stage ON pipeline_events(funnel_stage_id, occurred_at DESC);
CREATE INDEX idx_pipeline_events_type ON pipeline_events(event_type);

-- 6. METRIC SNAPSHOTS
CREATE TABLE metric_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_stage_id UUID NOT NULL REFERENCES funnel_stages(id),
    snapshot_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    sample_size INTEGER NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('meta_ads', 'ghl', 'internal', 'resend', 'twilio', 'stripe')),
    raw_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_metric_snapshots_stage_time ON metric_snapshots(funnel_stage_id, snapshot_time DESC);
CREATE INDEX idx_metric_snapshots_name_time ON metric_snapshots(metric_name, snapshot_time DESC);

-- 7. EMAIL METRICS
CREATE TABLE email_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id UUID REFERENCES funnels(id),
    email_id TEXT NOT NULL,
    email_subject TEXT,
    variant_id UUID,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    sent_count INTEGER NOT NULL DEFAULT 0,
    delivered_count INTEGER NOT NULL DEFAULT 0,
    opened_count INTEGER NOT NULL DEFAULT 0,
    clicked_count INTEGER NOT NULL DEFAULT 0,
    replied_count INTEGER NOT NULL DEFAULT 0,
    bounced_count INTEGER NOT NULL DEFAULT 0,
    unsubscribed_count INTEGER NOT NULL DEFAULT 0,
    open_rate NUMERIC GENERATED ALWAYS AS (
        CASE WHEN delivered_count > 0 THEN opened_count::NUMERIC / delivered_count ELSE 0 END
    ) STORED,
    click_rate NUMERIC GENERATED ALWAYS AS (
        CASE WHEN delivered_count > 0 THEN clicked_count::NUMERIC / delivered_count ELSE 0 END
    ) STORED,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_email_metrics_funnel ON email_metrics(funnel_id);

-- 8. AD METRICS
CREATE TABLE ad_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id UUID REFERENCES funnels(id),
    meta_campaign_id TEXT NOT NULL,
    meta_adset_id TEXT,
    meta_ad_id TEXT,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    impressions INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    spend_cents INTEGER NOT NULL DEFAULT 0,
    conversions INTEGER NOT NULL DEFAULT 0,
    leads INTEGER NOT NULL DEFAULT 0,
    ctr NUMERIC GENERATED ALWAYS AS (
        CASE WHEN impressions > 0 THEN clicks::NUMERIC / impressions ELSE 0 END
    ) STORED,
    cpc_cents NUMERIC GENERATED ALWAYS AS (
        CASE WHEN clicks > 0 THEN spend_cents::NUMERIC / clicks ELSE 0 END
    ) STORED,
    cpl_cents NUMERIC GENERATED ALWAYS AS (
        CASE WHEN leads > 0 THEN spend_cents::NUMERIC / leads ELSE 0 END
    ) STORED,
    frequency NUMERIC,
    relevance_score NUMERIC,
    raw_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ad_metrics_campaign_time ON ad_metrics(meta_campaign_id, period_start DESC);
CREATE INDEX idx_ad_metrics_funnel ON ad_metrics(funnel_id);

-- 9. PAGE ANALYTICS
CREATE TABLE page_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id UUID REFERENCES funnels(id),
    page_slug TEXT NOT NULL,
    variant_id UUID,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    visits INTEGER NOT NULL DEFAULT 0,
    unique_visitors INTEGER NOT NULL DEFAULT 0,
    conversions INTEGER NOT NULL DEFAULT 0,
    avg_time_on_page_seconds NUMERIC,
    avg_scroll_depth NUMERIC,
    bounce_rate NUMERIC,
    conversion_rate NUMERIC GENERATED ALWAYS AS (
        CASE WHEN visits > 0 THEN conversions::NUMERIC / visits ELSE 0 END
    ) STORED,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_page_analytics_slug ON page_analytics(page_slug, period_start DESC);

-- 10. A/B TESTS
CREATE TABLE ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id UUID NOT NULL REFERENCES funnels(id),
    funnel_stage_id UUID NOT NULL REFERENCES funnel_stages(id),
    test_name TEXT NOT NULL,
    test_type TEXT NOT NULL CHECK (test_type IN (
        'email_subject', 'email_body', 'landing_page', 'cta', 'ad_creative', 'ad_copy', 'headline'
    )),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'running', 'paused', 'completed', 'cancelled'
    )),
    winner_variant_id UUID,
    min_sample_per_variant INTEGER NOT NULL DEFAULT 100,
    confidence_threshold NUMERIC NOT NULL DEFAULT 0.95,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. A/B TEST VARIANTS
CREATE TABLE ab_test_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ab_test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    variant_label TEXT NOT NULL,
    variant_content JSONB NOT NULL,
    is_control BOOLEAN DEFAULT false,
    traffic_percentage NUMERIC NOT NULL DEFAULT 50,
    impressions INTEGER NOT NULL DEFAULT 0,
    conversions INTEGER NOT NULL DEFAULT 0,
    conversion_rate NUMERIC GENERATED ALWAYS AS (
        CASE WHEN impressions > 0 THEN conversions::NUMERIC / impressions ELSE 0 END
    ) STORED,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add FK from email_metrics to ab_test_variants
ALTER TABLE email_metrics ADD CONSTRAINT fk_email_variant
    FOREIGN KEY (variant_id) REFERENCES ab_test_variants(id);

-- 12. OPTIMIZATION ACTIONS (the audit trail)
CREATE TABLE optimization_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id UUID NOT NULL REFERENCES funnels(id),
    funnel_stage_id UUID REFERENCES funnel_stages(id),
    trigger_snapshot_id UUID REFERENCES metric_snapshots(id),
    action_type TEXT NOT NULL CHECK (action_type IN (
        'swap_email_subject', 'swap_email_body', 'adjust_ad_budget',
        'adjust_ad_targeting', 'change_cta', 'swap_landing_page',
        'modify_offer', 'pause_ad', 'launch_ad_variant',
        'change_email_timing', 'trigger_sms_sequence',
        'adjust_qualification_criteria', 'escalate_to_human',
        'revert_previous_action', 'custom'
    )),
    risk_tier TEXT NOT NULL DEFAULT 'low' CHECK (risk_tier IN ('low', 'medium', 'high')),
    status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN (
        'proposed', 'approved', 'executing', 'executed',
        'reviewing', 'kept', 'reverted', 'rejected', 'failed'
    )),
    diagnosis TEXT NOT NULL,
    action_details JSONB NOT NULL,
    previous_state JSONB,
    executed_at TIMESTAMPTZ,
    review_at TIMESTAMPTZ,
    review_window_hours INTEGER DEFAULT 48,
    impact_assessment JSONB,
    impact_verdict TEXT CHECK (impact_verdict IN ('positive', 'neutral', 'negative')),
    executed_by TEXT DEFAULT 'system',
    approved_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_optimization_actions_status ON optimization_actions(status);
CREATE INDEX idx_optimization_actions_review ON optimization_actions(review_at) WHERE status = 'executed';
CREATE INDEX idx_optimization_actions_funnel ON optimization_actions(funnel_id);

-- 13. AI CONVERSATIONS
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    funnel_id UUID REFERENCES funnels(id),
    channel TEXT NOT NULL CHECK (channel IN ('sms', 'email', 'chat')),
    conversation_type TEXT NOT NULL DEFAULT 'qualification' CHECK (conversation_type IN (
        'qualification', 'follow_up', 'no_show_recovery', 'reengagement', 'support'
    )),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
        'active', 'qualified', 'disqualified', 'booked', 'escalated', 'closed'
    )),
    messages JSONB NOT NULL DEFAULT '[]',
    qualification_signals JSONB DEFAULT '{}',
    message_count INTEGER NOT NULL DEFAULT 0,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_conversations_contact ON conversations(contact_id);
CREATE INDEX idx_conversations_status ON conversations(status);

-- 14. OBJECTION PLAYBOOK
CREATE TABLE objection_playbook (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_type TEXT NOT NULL,
    objection_category TEXT NOT NULL CHECK (objection_category IN (
        'price', 'timing', 'authority', 'trust', 'need', 'competitor', 'generic'
    )),
    objection_pattern TEXT NOT NULL,
    response_strategy TEXT NOT NULL,
    example_responses TEXT[],
    effectiveness_score NUMERIC DEFAULT 0.5,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 15. ALERTS
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id UUID REFERENCES funnels(id),
    optimization_action_id UUID REFERENCES optimization_actions(id),
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_alerts_unacknowledged ON alerts(created_at DESC) WHERE NOT acknowledged;

-- ============================================================
-- VIEWS
-- ============================================================

-- Funnel health at a glance
CREATE VIEW v_funnel_health AS
SELECT
    f.id AS funnel_id,
    f.name,
    f.offer_type,
    f.status,
    COUNT(DISTINCT fs.id) AS total_stages,
    COUNT(DISTINCT CASE
        WHEN latest.metric_value < sb.critical_threshold AND latest.sample_size >= sb.minimum_sample_size
        THEN fs.id
    END) AS critical_stages,
    COUNT(DISTINCT CASE
        WHEN latest.metric_value < sb.warning_threshold
        AND latest.metric_value >= sb.critical_threshold
        AND latest.sample_size >= sb.minimum_sample_size
        THEN fs.id
    END) AS warning_stages,
    CASE
        WHEN COUNT(DISTINCT CASE
            WHEN latest.metric_value < sb.critical_threshold AND latest.sample_size >= sb.minimum_sample_size
            THEN fs.id END) > 0 THEN 'critical'
        WHEN COUNT(DISTINCT CASE
            WHEN latest.metric_value < sb.warning_threshold AND latest.sample_size >= sb.minimum_sample_size
            THEN fs.id END) > 0 THEN 'warning'
        ELSE 'healthy'
    END AS health_status
FROM funnels f
JOIN funnel_stages fs ON fs.funnel_id = f.id
LEFT JOIN stage_baselines sb ON sb.funnel_stage_id = fs.id AND sb.metric_name = 'conversion_rate'
LEFT JOIN LATERAL (
    SELECT metric_value, sample_size
    FROM metric_snapshots
    WHERE funnel_stage_id = fs.id AND metric_name = 'conversion_rate'
    ORDER BY snapshot_time DESC
    LIMIT 1
) latest ON true
WHERE f.status = 'active'
GROUP BY f.id, f.name, f.offer_type, f.status;

-- Stage-by-stage conversion funnel
CREATE VIEW v_funnel_conversion AS
SELECT
    fs.funnel_id,
    fs.stage_order,
    fs.stage_name,
    fs.stage_type,
    latest.metric_value AS current_rate,
    sb.baseline_value AS baseline_rate,
    sb.warning_threshold,
    sb.critical_threshold,
    latest.sample_size,
    latest.snapshot_time AS last_measured,
    CASE
        WHEN latest.metric_value IS NULL THEN 'no_data'
        WHEN latest.sample_size < COALESCE(sb.minimum_sample_size, 50) THEN 'insufficient_data'
        WHEN latest.metric_value < sb.critical_threshold THEN 'critical'
        WHEN latest.metric_value < sb.warning_threshold THEN 'warning'
        ELSE 'healthy'
    END AS stage_health
FROM funnel_stages fs
LEFT JOIN stage_baselines sb ON sb.funnel_stage_id = fs.id AND sb.metric_name = 'conversion_rate'
LEFT JOIN LATERAL (
    SELECT metric_value, sample_size, snapshot_time
    FROM metric_snapshots
    WHERE funnel_stage_id = fs.id AND metric_name = 'conversion_rate'
    ORDER BY snapshot_time DESC
    LIMIT 1
) latest ON true
ORDER BY fs.funnel_id, fs.stage_order;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE objection_playbook ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Admin policy: authenticated users can do everything
-- (Steve is the only authenticated user)
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'funnels', 'funnel_stages', 'stage_baselines', 'contacts',
        'pipeline_events', 'metric_snapshots', 'email_metrics',
        'ad_metrics', 'page_analytics', 'ab_tests', 'ab_test_variants',
        'optimization_actions', 'conversations', 'objection_playbook', 'alerts'
    ])
    LOOP
        EXECUTE format('CREATE POLICY admin_all ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl);
    END LOOP;
END $$;

-- Service role policy: edge functions need full access
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'funnels', 'funnel_stages', 'stage_baselines', 'contacts',
        'pipeline_events', 'metric_snapshots', 'email_metrics',
        'ad_metrics', 'page_analytics', 'ab_tests', 'ab_test_variants',
        'optimization_actions', 'conversations', 'objection_playbook', 'alerts'
    ])
    LOOP
        EXECUTE format('CREATE POLICY service_all ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', tbl);
    END LOOP;
END $$;

-- Public can insert contacts (from landing page forms) and pipeline events
CREATE POLICY public_insert_contacts ON contacts FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY public_insert_events ON pipeline_events FOR INSERT TO anon WITH CHECK (true);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON funnels FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON optimization_actions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON stage_baselines FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE optimization_actions;
ALTER PUBLICATION supabase_realtime ADD TABLE metric_snapshots;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
