-- =====================================================================
-- Migration 00007: Integration usage tracking
--
-- Lightweight cost tracking for AI/SMS/email/ads usage. The CFO agent
-- will roll this up daily for billing and model-policy decisions.
--
-- Per-tenant credential storage (the full client_integrations table) is
-- a separate concern handled in a later migration.
-- =====================================================================

CREATE TABLE IF NOT EXISTS integration_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,

    -- Which provider/service this usage was for
    integration_type TEXT NOT NULL,
    -- Examples: 'anthropic', 'openai', 'deepseek', 'twilio', 'resend', 'meta_ads', 'stripe', 'ghl'

    -- What was done — granular for analysis
    -- Examples: 'research_agent', 'strategist', 'section:hero', 'email:1', 'send_sms', 'create_ad'
    operation TEXT NOT NULL,

    -- Quantity (AI = total tokens, SMS = segments, email = count, ads = impressions, etc.)
    units_consumed INTEGER NOT NULL DEFAULT 0,

    -- Cost in USD cents (rounded up)
    cost_cents INTEGER,

    -- Optional attribution
    funnel_id UUID REFERENCES funnels(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',

    -- For metered billing roll-ups
    occurred_at TIMESTAMPTZ DEFAULT now(),
    billed BOOLEAN DEFAULT FALSE,
    billed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_integration_usage_client_period
    ON integration_usage(client_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_integration_usage_unbilled
    ON integration_usage(client_id, billed)
    WHERE billed = FALSE;

CREATE INDEX IF NOT EXISTS idx_integration_usage_operation
    ON integration_usage(operation, occurred_at);

-- ---------------------------------------------------------------------
-- RLS — clients see their own usage; service role inserts
-- ---------------------------------------------------------------------
ALTER TABLE integration_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their client usage" ON integration_usage;
CREATE POLICY "Users can view their client usage"
    ON integration_usage FOR SELECT
    USING (
        is_admin() OR client_id = ANY(user_client_ids())
    );

DROP POLICY IF EXISTS "Service role inserts usage" ON integration_usage;
CREATE POLICY "Service role inserts usage"
    ON integration_usage FOR INSERT
    WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
