-- =====================================================================
-- Migration 00005: Per-tenant integrations
--
-- Each client (workspace) brings their own API credentials for the
-- services SOPHIA orchestrates. Credentials are encrypted at rest using
-- pgsodium (Supabase Vault).
--
-- This is the foundation for the SaaS model: customers connect their own
-- Twilio/Meta/Stripe/etc accounts and SOPHIA acts on their behalf.
-- =====================================================================

-- Enable pgsodium for symmetric encryption (Supabase Vault)
-- Note: Supabase has Vault enabled by default but we ensure pgsodium is loaded
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- ---------------------------------------------------------------------
-- 1. CLIENT INTEGRATIONS — one row per (client, service)
-- ---------------------------------------------------------------------
CREATE TABLE client_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

    -- Which service this integration connects to
    integration_type TEXT NOT NULL CHECK (integration_type IN (
        'anthropic',   -- Claude AI (for content generation, sales agent)
        'resend',      -- Email sending
        'twilio',      -- SMS
        'meta_ads',    -- Facebook/Instagram ads
        'stripe',      -- Payment processing
        'ghl'          -- GoHighLevel CRM
    )),

    -- Connection status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',     -- Created but not yet validated
        'connected',   -- Working
        'error',       -- Last validation failed
        'expired',     -- Credentials expired (e.g., OAuth token)
        'revoked'      -- User disconnected
    )),

    -- Encrypted credentials (JSON containing api_key, secret, oauth_tokens, etc.)
    -- Encrypted via pgsodium — never store plaintext
    credentials_encrypted BYTEA,

    -- Encryption key ID (references pgsodium.key for rotation)
    credentials_key_id UUID,

    -- Non-secret metadata (account IDs, phone numbers, sender domains, etc.)
    -- Safe to query and display in UI
    metadata JSONB NOT NULL DEFAULT '{}',

    -- Validation tracking
    last_validated_at TIMESTAMPTZ,
    last_error TEXT,

    -- OAuth lifecycle (for integrations that use it)
    expires_at TIMESTAMPTZ,
    refresh_token_expires_at TIMESTAMPTZ,

    -- Audit
    connected_at TIMESTAMPTZ,
    connected_by UUID REFERENCES auth.users(id),
    disconnected_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(client_id, integration_type)
);

CREATE INDEX idx_client_integrations_client ON client_integrations(client_id);
CREATE INDEX idx_client_integrations_type_status ON client_integrations(integration_type, status);

-- ---------------------------------------------------------------------
-- 2. INTEGRATION USAGE LOG — track per-tenant usage for billing
-- ---------------------------------------------------------------------
CREATE TABLE integration_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    integration_type TEXT NOT NULL,

    -- What was used
    operation TEXT NOT NULL,   -- e.g. 'send_email', 'send_sms', 'claude_chat', 'meta_create_ad'

    -- Quantity (for AI = tokens, for SMS = segments, for email = count)
    units_consumed INTEGER NOT NULL DEFAULT 1,

    -- Cost basis (for AI pass-through billing)
    cost_cents INTEGER,

    -- Reference to source (campaign, funnel, etc.)
    funnel_id UUID REFERENCES funnels(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',

    -- For metered billing roll-ups
    occurred_at TIMESTAMPTZ DEFAULT now(),
    billed BOOLEAN DEFAULT FALSE,
    billed_at TIMESTAMPTZ
);

CREATE INDEX idx_integration_usage_client_period
    ON integration_usage(client_id, occurred_at);
CREATE INDEX idx_integration_usage_unbilled
    ON integration_usage(client_id, billed)
    WHERE billed = FALSE;

-- ---------------------------------------------------------------------
-- 3. ENCRYPTION HELPERS (using pgsodium symmetric encryption)
-- ---------------------------------------------------------------------

-- Create a dedicated encryption key for client credentials
-- This key is managed by Supabase Vault and never leaves the database
DO $$
DECLARE
    v_key_id UUID;
BEGIN
    -- Create a key if one doesn't exist with this name
    IF NOT EXISTS (
        SELECT 1 FROM pgsodium.key WHERE name = 'sophia_credentials_key'
    ) THEN
        INSERT INTO pgsodium.key (name, raw_key_nonce)
        VALUES ('sophia_credentials_key', NULL)
        RETURNING id INTO v_key_id;
    END IF;
END $$;

-- Encrypt credentials JSON
CREATE OR REPLACE FUNCTION encrypt_credentials(
    p_credentials JSONB
) RETURNS BYTEA
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgsodium
AS $$
DECLARE
    v_key_id UUID;
    v_ciphertext BYTEA;
BEGIN
    SELECT id INTO v_key_id FROM pgsodium.key WHERE name = 'sophia_credentials_key' LIMIT 1;
    IF v_key_id IS NULL THEN
        RAISE EXCEPTION 'sophia_credentials_key not found';
    END IF;

    v_ciphertext := pgsodium.crypto_aead_det_encrypt(
        convert_to(p_credentials::text, 'utf8'),
        convert_to('client_integrations', 'utf8'),  -- additional data binds to table
        v_key_id
    );

    RETURN v_ciphertext;
END $$;

-- Decrypt credentials JSON
CREATE OR REPLACE FUNCTION decrypt_credentials(
    p_ciphertext BYTEA
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgsodium
AS $$
DECLARE
    v_key_id UUID;
    v_plaintext TEXT;
BEGIN
    SELECT id INTO v_key_id FROM pgsodium.key WHERE name = 'sophia_credentials_key' LIMIT 1;
    IF v_key_id IS NULL THEN
        RAISE EXCEPTION 'sophia_credentials_key not found';
    END IF;

    v_plaintext := convert_from(
        pgsodium.crypto_aead_det_decrypt(
            p_ciphertext,
            convert_to('client_integrations', 'utf8'),
            v_key_id
        ),
        'utf8'
    );

    RETURN v_plaintext::jsonb;
END $$;

-- Convenience RPC: set credentials for an integration (auto-encrypts)
CREATE OR REPLACE FUNCTION set_integration_credentials(
    p_client_id UUID,
    p_integration_type TEXT,
    p_credentials JSONB,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_integration_id UUID;
BEGIN
    INSERT INTO client_integrations (
        client_id,
        integration_type,
        credentials_encrypted,
        metadata,
        status,
        connected_at
    ) VALUES (
        p_client_id,
        p_integration_type,
        encrypt_credentials(p_credentials),
        p_metadata,
        'pending',
        now()
    )
    ON CONFLICT (client_id, integration_type)
    DO UPDATE SET
        credentials_encrypted = encrypt_credentials(p_credentials),
        metadata = client_integrations.metadata || p_metadata,
        status = 'pending',
        last_error = NULL,
        connected_at = now(),
        updated_at = now()
    RETURNING id INTO v_integration_id;

    RETURN v_integration_id;
END $$;

-- Convenience RPC: get decrypted credentials (server-only)
CREATE OR REPLACE FUNCTION get_integration_credentials(
    p_client_id UUID,
    p_integration_type TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_encrypted BYTEA;
    v_status TEXT;
BEGIN
    SELECT credentials_encrypted, status
    INTO v_encrypted, v_status
    FROM client_integrations
    WHERE client_id = p_client_id
      AND integration_type = p_integration_type;

    IF v_encrypted IS NULL THEN
        RETURN NULL;
    END IF;

    -- Don't return credentials for revoked/expired integrations
    IF v_status IN ('revoked', 'expired') THEN
        RETURN NULL;
    END IF;

    RETURN decrypt_credentials(v_encrypted);
END $$;

-- ---------------------------------------------------------------------
-- 4. RLS — only service role can read encrypted credentials
-- ---------------------------------------------------------------------
ALTER TABLE client_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_usage ENABLE ROW LEVEL SECURITY;

-- Admins and client users can see WHICH integrations they have, but not the
-- encrypted blob (the column is excluded by default — they should query
-- a view that hides the credentials_encrypted column).
CREATE POLICY "Users can view their client integrations metadata"
    ON client_integrations FOR SELECT
    USING (
        is_admin() OR client_id = ANY(user_client_ids())
    );

-- Only admins can insert/update/delete via RLS (service role bypasses anyway)
CREATE POLICY "Admins manage integrations"
    ON client_integrations FOR ALL
    USING (is_admin());

-- Usage rows: same access pattern
CREATE POLICY "Users can view their client usage"
    ON integration_usage FOR SELECT
    USING (
        is_admin() OR client_id = ANY(user_client_ids())
    );

CREATE POLICY "Service role inserts usage"
    ON integration_usage FOR INSERT
    WITH CHECK (true);  -- service role bypasses; admins via API

-- ---------------------------------------------------------------------
-- 5. CONVENIENCE VIEW — integrations without encrypted blob
-- ---------------------------------------------------------------------
CREATE VIEW v_client_integrations AS
SELECT
    id,
    client_id,
    integration_type,
    status,
    metadata,
    last_validated_at,
    last_error,
    expires_at,
    connected_at,
    disconnected_at,
    created_at,
    updated_at,
    -- Boolean instead of exposing the blob
    (credentials_encrypted IS NOT NULL) AS has_credentials
FROM client_integrations;

ALTER VIEW v_client_integrations SET (security_invoker = true);

-- ---------------------------------------------------------------------
-- 6. UPDATED_AT TRIGGER
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_client_integrations_updated_at
    BEFORE UPDATE ON client_integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
