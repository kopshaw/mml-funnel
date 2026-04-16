import { Suspense } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { ClientProvider, type Client } from "@/lib/client-context";
import { createAdminClient } from "@/lib/supabase/admin";

async function getClients(): Promise<Client[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, slug, name")
    .eq("status", "active")
    .order("name");

  if (error) {
    console.error("Failed to load clients:", error.message);
    return [];
  }

  return (data ?? []) as Client[];
}

async function DashboardShell({ children }: { children: React.ReactNode }) {
  const clients = await getClients();

  return (
    <ClientProvider initialClients={clients} initialRole="admin">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col pl-64">
          <Header />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </ClientProvider>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}
