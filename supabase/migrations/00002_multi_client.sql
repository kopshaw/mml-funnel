-- ============================================================
-- Multi-Client Support Migration
-- ============================================================

-- 1. CLIENTS TABLE
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    industry TEXT,
    website TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'archived')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_clients_slug ON clients(slug);
CREATE INDEX idx_clients_status ON clients(status);

-- 2. CLIENT_USERS TABLE
CREATE TABLE client_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'client_viewer'
        CHECK (role IN ('admin', 'client_viewer')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, client_id)
);

CREATE INDEX idx_client_users_user ON client_users(user_id);
CREATE INDEX idx_client_users_client ON client_users(client_id);

-- 3. ADD client_id TO EXISTING TABLES
ALTER TABLE funnels ADD COLUMN client_id UUID REFERENCES clients(id);
ALTER TABLE contacts ADD COLUMN client_id UUID REFERENCES clients(id);
ALTER TABLE conversations ADD COLUMN client_id UUID REFERENCES clients(id);
ALTER TABLE optimization_actions ADD COLUMN client_id UUID REFERENCES clients(id);
ALTER TABLE alerts ADD COLUMN client_id UUID REFERENCES clients(id);
ALTER TABLE objection_playbook ADD COLUMN client_id UUID REFERENCES clients(id);
ALTER TABLE ad_metrics ADD COLUMN client_id UUID REFERENCES clients(id);

CREATE INDEX idx_funnels_client ON funnels(client_id);
CREATE INDEX idx_contacts_client ON contacts(client_id);
CREATE INDEX idx_conversations_client ON conversations(client_id);
CREATE INDEX idx_optimization_actions_client ON optimization_actions(client_id);
CREATE INDEX idx_alerts_client ON alerts(client_id);
CREATE INDEX idx_ad_metrics_client ON ad_metrics(client_id);

-- 4. TRIGGERS
CREATE TRIGGER set_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. RLS HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION is_admin(uid UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM client_users WHERE user_id = uid AND role = 'admin'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION user_client_ids(uid UUID)
RETURNS SETOF UUID AS $$
    SELECT client_id FROM client_users WHERE user_id = uid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 6. RLS ON NEW TABLES
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_all_clients ON clients FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_all_client_users ON client_users FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY admin_clients ON clients FOR ALL TO authenticated
    USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY viewer_clients ON clients FOR SELECT TO authenticated
    USING (id IN (SELECT user_client_ids(auth.uid())));

CREATE POLICY admin_client_users ON client_users FOR ALL TO authenticated
    USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY viewer_own_client_users ON client_users FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- 7. REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE clients;
