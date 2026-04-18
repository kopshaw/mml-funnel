-- =====================================================================
-- Migration 00009: Client domains (subdomain + custom domain routing)
--
-- Each client gets:
--   - A subdomain on sophiafunnels.com (e.g. mml.sophiafunnels.com)
--   - Optional custom domain (e.g. funnels.metricmentorlabs.com)
--
-- The host-resolution middleware reads the Host header on every request,
-- looks up the matching client, and scopes funnel queries to that client.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Extend clients with domain columns
-- ---------------------------------------------------------------------
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS subdomain TEXT,
  ADD COLUMN IF NOT EXISTS custom_domain TEXT,
  ADD COLUMN IF NOT EXISTS custom_domain_status TEXT
    CHECK (custom_domain_status IN ('pending', 'verifying', 'verified', 'failed', 'revoked')),
  ADD COLUMN IF NOT EXISTS custom_domain_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS custom_domain_error TEXT,
  ADD COLUMN IF NOT EXISTS custom_domain_verification_token TEXT;

-- Uniqueness (case-insensitive for domains)
CREATE UNIQUE INDEX IF NOT EXISTS uidx_clients_subdomain_lower
  ON clients (LOWER(subdomain))
  WHERE subdomain IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_clients_custom_domain_lower
  ON clients (LOWER(custom_domain))
  WHERE custom_domain IS NOT NULL;

-- Seed subdomains from existing slugs (MML gets 'mml.sophiafunnels.com', etc.)
UPDATE clients
SET subdomain = slug
WHERE subdomain IS NULL AND slug IS NOT NULL;

-- ---------------------------------------------------------------------
-- 2. Domain events log (audit trail for troubleshooting)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS client_domain_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL CHECK (event_type IN (
    'subdomain_set',
    'subdomain_changed',
    'custom_domain_added',
    'custom_domain_verified',
    'custom_domain_verification_failed',
    'custom_domain_removed'
  )),

  -- Old/new values for diff tracking
  previous_value TEXT,
  new_value TEXT,

  -- Context (who did it, what error, DNS records seen, etc.)
  actor_user_id UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',

  occurred_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_domain_events_client
  ON client_domain_events(client_id, occurred_at DESC);

-- ---------------------------------------------------------------------
-- 3. Helper view: all domains per client (for middleware lookups)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_client_by_host AS
  SELECT
    id as client_id,
    LOWER(subdomain) as host_key,
    'subdomain' as match_type,
    name,
    slug,
    tier,
    status
  FROM clients
  WHERE subdomain IS NOT NULL AND status = 'active'
  UNION ALL
  SELECT
    id as client_id,
    LOWER(custom_domain) as host_key,
    'custom_domain' as match_type,
    name,
    slug,
    tier,
    status
  FROM clients
  WHERE custom_domain IS NOT NULL
    AND custom_domain_status = 'verified'
    AND status = 'active';

ALTER VIEW v_client_by_host SET (security_invoker = true);

-- ---------------------------------------------------------------------
-- 4. RLS for domain events
-- ---------------------------------------------------------------------
ALTER TABLE client_domain_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access domain events" ON client_domain_events;
CREATE POLICY "Service role full access domain events"
  ON client_domain_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users see their domain events" ON client_domain_events;
CREATE POLICY "Users see their domain events"
  ON client_domain_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM client_users cu
    WHERE cu.client_id = client_domain_events.client_id AND cu.user_id = auth.uid()
  ));

NOTIFY pgrst, 'reload schema';
