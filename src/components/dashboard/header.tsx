"use client";

import { usePathname } from "next/navigation";
import { Bell, User, ChevronRight } from "lucide-react";
import { useClient } from "@/lib/client-context";

const pageTitles: Record<string, string> = {
  "/overview": "Overview",
  "/traffic": "Traffic & Ads",
  "/pipeline": "Pipeline",
  "/revenue": "Revenue",
  "/conversations": "Conversations",
  "/funnels": "Funnel Overview",
  "/healing": "Self-Healing Activity",
  "/alerts": "Alerts",
  "/settings": "Settings",
};

export function Header() {
  const pathname = usePathname();
  const { clientSlug, clients } = useClient();

  const title = pageTitles[pathname] ?? "MML Funnel Command Center";

  const activeClient = clients.find((c) => c.slug === clientSlug);

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
      </div>
    </header>
  );
}
