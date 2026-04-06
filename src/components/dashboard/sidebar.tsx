"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bell,
  DollarSign,
  LayoutDashboard,
  MessageSquare,
  Rocket,
  Settings,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ClientSwitcher } from "@/components/dashboard/client-switcher";

const navItems = [
  { label: "Overview", href: "/overview", icon: LayoutDashboard },
  { label: "Campaigns", href: "/campaigns", icon: Rocket },
  { label: "Traffic & Ads", href: "/traffic", icon: BarChart3 },
  { label: "Pipeline", href: "/pipeline", icon: Users },
  { label: "Revenue", href: "/revenue", icon: DollarSign },
  { label: "Conversations", href: "/conversations", icon: MessageSquare },
  { label: "Funnels", href: "/funnels", icon: Activity },
  { label: "Self-Healing", href: "/healing", icon: Zap },
  { label: "Alerts", href: "/alerts", icon: Bell, badge: 3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Preserve the ?client= param across nav links
  function buildHref(basePath: string) {
    const clientParam = searchParams.get("client");
    if (clientParam) {
      return `${basePath}?client=${encodeURIComponent(clientParam)}`;
    }
    return basePath;
  }

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-950">
      {/* Logo area */}
      <div className="flex h-16 items-center gap-2 border-b border-slate-800 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-semibold tracking-tight text-slate-100">
          MML Funnel
        </span>
      </div>

      {/* Client Switcher */}
      <div className="border-b border-slate-800 px-3 py-3">
        <ClientSwitcher />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={buildHref(item.href)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-600/15 text-blue-400"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-semibold text-white">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-800 px-4 py-3">
        <p className="text-xs text-slate-500">Metric Mentor Labs</p>
      </div>
    </aside>
  );
}
