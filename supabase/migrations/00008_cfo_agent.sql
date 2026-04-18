-- =====================================================================
-- Migration 00008: CFO Agent
--
-- Adds the infrastructure the CFO agent needs to monitor per-client
-- cost vs revenue and dynamically adjust model policy.
--
-- Adds to `clients`:
--   - tier + ai_budget_cents_monthly + trial_ends_at
-- Creates:
--   - cfo_insights (log of what CFO observed + what it did)
--   - model_policy_overrides (per-client / per-task model demotions)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Extend clients table
-- ---------------------------------------------------------------------
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'starter'
    CHECK (tier IN ('trial', 'starter', 'pro', 'agency', 'enterprise', 'internal')),
  ADD COLUMN IF NOT EXISTS ai_budget_cents_monthly INTEGER,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- MML internal client gets the 'internal' tier
UPDATE clients SET tier = 'internal', ai_budget_cents_monthly = NULL
  WHERE slug = 'mml';

-- Default budgets for new sign-ups (can be overridden per-client)
-- These are in USD cents. Nullable = no cap.
COMMENT ON COLUMN clients.ai_budget_cents_monthly IS
  'Monthly AI spend cap in cents. NULL = unlimited. When exceeded, CFO agent demotes non-critical tasks to cheapest provider.';

-- ---------------------------------------------------------------------
-- 2. CFO insights — log of what CFO observed + what it decided
-- ---------------------------------------------------------------------
CREATE TABLE cfo_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,

  -- What kind of insight?
  insight_type TEXT NOT NULL CHECK (insight_type IN (
    'burn_alert',        -- AI cost spiked
    'margin_negative',   -- costs > revenue
    'budget_exceeded',   -- monthly cap hit
    'tier_upgrade',      -- usage justifies upgrade
    'tier_downgrade',    -- usage below tier
    'model_demoted',     -- CFO auto-switched a task to cheaper model
    'model_promoted',    -- CFO promoted a task to better model
    'healthy',           -- periodic all-good checkpoint
    'trial_expiring'
  )),

  severity TEXT NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info', 'warning', 'critical')),

  -- What happened
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Numeric context
  current_value_cents INTEGER,   -- e.g. current daily burn
  threshold_cents INTEGER,        -- e.g. what triggered it
  previous_value_cents INTEGER,   -- e.g. prior period's burn

  -- What CFO did about it
  action_taken TEXT,              -- e.g. 'demoted section_copy to deepseek-chat'
  auto_resolved BOOLEAN DEFAULT FALSE,

  -- Context for humans
  metrics_snapshot JSONB DEFAULT '{}',

  -- Timestamps
  observed_at TIMESTAMPTZ DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID
);

CREATE INDEX idx_cfo_insights_client_period ON cfo_insights(client_id, observed_at DESC);
CREATE INDEX idx_cfo_insights_unack ON cfo_insights(client_id, observed_at DESC)
  WHERE acknowledged_at IS NULL;

-- ---------------------------------------------------------------------
-- 3. Model policy overrides — per-client task→model pins
--
-- Normal path: router.TASK_POLICY defines a preferred model per task.
-- CFO can override by inserting a row here: "for client X, demote task
-- section_copy from claude-haiku-4-5 to deepseek-chat."
--
-- Overrides expire automatically so they don't persist forever.
-- ---------------------------------------------------------------------
CREATE TABLE model_policy_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,

  -- Which task does this override? NULL = applies to ALL tasks for this client
  task_type TEXT,
  -- Examples: 'research', 'strategist', 'section_copy', 'email_copy', etc.

  -- Force this model (model key from MODEL_CATALOG)
  model_key TEXT NOT NULL,

  -- Direction
  kind TEXT NOT NULL CHECK (kind IN ('demote', 'promote', 'pin')),

  -- Why
  reason TEXT,
  triggering_insight_id UUID REFERENCES cfo_insights(id) ON DELETE SET NULL,

  -- Lifecycle
  active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_model_policy_client_task
  ON model_policy_overrides(client_id, task_type)
  WHERE active = TRUE;

CREATE INDEX idx_model_policy_expired
  ON model_policy_overrides(expires_at)
  WHERE active = TRUE AND expires_at IS NOT NULL;

-- ---------------------------------------------------------------------
-- 4. Auto-expire stale overrides
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION expire_stale_model_overrides()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE model_policy_overrides
    SET active = FALSE, revoked_at = now()
    WHERE active = TRUE
      AND expires_at IS NOT NULL
      AND expires_at < now();
END $$;

-- ---------------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------------
ALTER TABLE cfo_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_policy_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access cfo_insights"
  ON cfo_insights FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Users see their client's insights"
  ON cfo_insights FOR SELECT TO authenticated
  USING (
    client_id IS NULL OR EXISTS (
      SELECT 1 FROM client_users cu
      WHERE cu.client_id = cfo_insights.client_id AND cu.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access model_policy"
  ON model_policy_overrides FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Users see their policy overrides"
  ON model_policy_overrides FOR SELECT TO authenticated
  USING (
    client_id IS NULL OR EXISTS (
      SELECT 1 FROM client_users cu
      WHERE cu.client_id = model_policy_overrides.client_id AND cu.user_id = auth.uid()
    )
  );

NOTIFY pgrst, 'reload schema';
