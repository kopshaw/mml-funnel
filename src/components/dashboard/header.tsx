"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, User, ChevronRight, LogOut, ChevronDown, Building2, Globe } from "lucide-react";
import { useClient } from "@/lib/client-context";
import { createClient } from "@/lib/supabase/client";

const pageTitles: Record<string, string> = {
  "/overview": "SOPHIA Overview",
  "/traffic": "Traffic & Ads",
  "/pipeline": "Pipeline",
  "/revenue": "Revenue",
  "/conversations": "Conversations",
  "/funnels": "Funnel Overview",
  "/healing": "SOPHIA Optimization",
  "/alerts": "Alerts",
  "/settings": "Settings",
  "/campaigns": "Campaigns",
  "/campaigns/new": "New Campaign",
  "/roadmap": "Roadmap",
};

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { clientSlug, clients, setClient, isAdmin } = useClient();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const title = pageTitles[pathname] ?? "SOPHIA";
  const activeClient = clients.find((c) => c.slug === clientSlug);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/80 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-slate-100">{title}</h1>
        {activeClient && (
          <>
            <ChevronRight className="h-4 w-4 text-slate-600" />
            <span className="text-sm font-medium text-slate-400">
              {activeClient.name}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Client Switcher */}
        {isAdmin && clients.length > 0 && (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
            >
              <Building2 className="h-3.5 w-3.5" />
              {activeClient?.name ?? "All Clients"}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-1 w-56 rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setClient(null);
                    setDropdownOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-700 ${
                    !clientSlug ? "text-blue-400 font-medium" : "text-slate-300"
                  }`}
                >
                  <Globe className="h-3.5 w-3.5" />
                  All Clients
                </button>
                <div className="my-1 border-t border-slate-700" />
                {clients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => {
                      setClient(client.slug);
                      setDropdownOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-700 ${
                      clientSlug === client.slug
                        ? "text-blue-400 font-medium"
                        : "text-slate-300"
                    }`}
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    {client.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notification bell */}
        <button
          type="button"
          className="relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>

        {/* User avatar */}
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 transition-colors hover:bg-blue-600/30"
        >
          <User className="h-4 w-4" />
        </button>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          title="Sign out"
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
