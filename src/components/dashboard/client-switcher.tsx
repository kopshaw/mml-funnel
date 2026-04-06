"use client";

import { useState, useRef, useEffect } from "react";
import { useClient } from "@/lib/client-context";
import { ChevronDown, Building2, Globe } from "lucide-react";

export function ClientSwitcher() {
  const { clientSlug, clients, setClient, isAdmin } = useClient();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeClient = clients.find((c) => c.slug === clientSlug);
  const displayName = activeClient?.name ?? "All Clients";

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (clients.length === 0 && !isAdmin) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
      >
        <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="flex-1 truncate text-left">{displayName}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
          <div className="max-h-64 overflow-y-auto py-1">
            {/* All Clients option — admin only */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setClient(null);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  clientSlug === null
                    ? "bg-blue-600/15 text-blue-400"
                    : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                }`}
              >
                <Globe className="h-4 w-4 shrink-0" />
                <span>All Clients</span>
              </button>
            )}

            {/* Divider */}
            {isAdmin && clients.length > 0 && (
              <div className="mx-2 my-1 border-t border-slate-700" />
            )}

            {/* Client list */}
            {clients.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => {
                  setClient(client.slug);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  clientSlug === client.slug
                    ? "bg-blue-600/15 text-blue-400"
                    : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                }`}
              >
                <Building2 className="h-4 w-4 shrink-0" />
                <span className="truncate">{client.name}</span>
              </button>
            ))}

            {clients.length === 0 && (
              <p className="px-3 py-2 text-sm text-slate-500">
                No clients available
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
