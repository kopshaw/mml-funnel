import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DomainManager } from "@/components/settings/domain-manager";

export default async function DomainsSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div className="text-slate-400">Please sign in.</div>;
  }

  // Find clients this user admins
  const admin = createAdminClient();
  const { data: memberships } = await admin
    .from("client_users")
    .select("client_id, role, clients(id, name, slug, subdomain, custom_domain, custom_domain_status, custom_domain_verified_at, custom_domain_error, custom_domain_verification_token)")
    .eq("user_id", user.id)
    .in("role", ["admin", "owner"]);

  const clients = (memberships ?? []).map((m) => m.clients as unknown as {
    id: string;
    name: string;
    slug: string;
    subdomain: string | null;
    custom_domain: string | null;
    custom_domain_status: string | null;
    custom_domain_verified_at: string | null;
    custom_domain_error: string | null;
    custom_domain_verification_token: string | null;
  }).filter(Boolean);

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
        <h1 className="text-2xl md:text-3xl font-bold text-white">Domains</h1>
        <p className="text-sm text-slate-400 mt-1">
          Every workspace gets a free subdomain on sophiafunnels.com. You can also connect your own
          custom domain so your funnels live at your URL.
        </p>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
          <p className="text-slate-400">
            You don&apos;t have admin access to any workspaces yet.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {clients.map((client) => (
            <DomainManager key={client.id} client={client} />
          ))}
        </div>
      )}
    </div>
  );
}
