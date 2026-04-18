import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { IntegrationsManager } from "@/components/settings/integrations-manager";

export default async function IntegrationsSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <div className="text-slate-400">Please sign in.</div>;

  const admin = createAdminClient();
  const { data: memberships } = await admin
    .from("client_users")
    .select("client_id, role, clients(id, name, slug)")
    .eq("user_id", user.id)
    .in("role", ["admin", "owner"]);

  const clients = (memberships ?? [])
    .map((m) => m.clients as unknown as { id: string; name: string; slug: string })
    .filter(Boolean);

  // Load existing integrations for all clients
  const clientIds = clients.map((c) => c.id);
  const { data: existing } = clientIds.length
    ? await admin
        .from("client_integrations")
        .select("client_id, integration_type, status, metadata, last_validated_at, last_error, connected_at")
        .in("client_id", clientIds)
    : { data: [] };

  const byClient: Record<string, Array<{
    integration_type: string;
    status: string;
    metadata: Record<string, unknown>;
    last_validated_at: string | null;
    last_error: string | null;
    connected_at: string | null;
  }>> = {};
  for (const row of existing ?? []) {
    const cid = row.client_id as string;
    if (!byClient[cid]) byClient[cid] = [];
    byClient[cid].push({
      integration_type: row.integration_type as string,
      status: row.status as string,
      metadata: (row.metadata ?? {}) as Record<string, unknown>,
      last_validated_at: row.last_validated_at as string | null,
      last_error: row.last_error as string | null,
      connected_at: row.connected_at as string | null,
    });
  }

  return (
    <div className="space-y-6">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Settings
      </Link>

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Integrations</h1>
        <p className="text-sm text-slate-400 mt-1">
          Bring your own keys for every service SOPHIA uses. Keys are stored securely and never
          leave the server. When you connect a service, all workspace activity routes through
          your account &mdash; not ours.
        </p>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
          <p className="text-slate-400">No workspaces you can manage.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {clients.map((c) => (
            <IntegrationsManager
              key={c.id}
              client={c}
              initial={byClient[c.id] ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
