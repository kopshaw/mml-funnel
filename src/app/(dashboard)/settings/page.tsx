"use client";

import { useState, useEffect } from "react";
import {
  Building2,
  Sliders,
  Plug,
  Users,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Inbox,
} from "lucide-react";

const tabs = [
  { id: "clients", label: "Clients", icon: Building2 },
  { id: "config", label: "Funnel Config", icon: Sliders },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "users", label: "Users", icon: Users },
];

const integrations = [
  {
    name: "Supabase",
    description: "Database & Auth",
    status: "connected",
    envVar: "NEXT_PUBLIC_SUPABASE_URL",
  },
  {
    name: "Claude API",
    description: "AI Reasoning",
    status: "connected",
    envVar: "ANTHROPIC_API_KEY",
  },
  {
    name: "Meta Ads",
    description: "Ad Management",
    status: "not_configured",
    envVar: "META_ACCESS_TOKEN",
  },
  {
    name: "Resend",
    description: "Email Sending",
    status: "not_configured",
    envVar: "RESEND_API_KEY",
  },
  {
    name: "Twilio",
    description: "SMS Messaging",
    status: "not_configured",
    envVar: "TWILIO_ACCOUNT_SID",
  },
  {
    name: "Stripe",
    description: "Payments",
    status: "not_configured",
    envVar: "STRIPE_SECRET_KEY",
  },
  {
    name: "GoHighLevel",
    description: "CRM Bridge",
    status: "not_configured",
    envVar: "GHL_API_KEY",
  },
];

interface ClientData {
  id: string;
  name: string;
  slug: string;
  industry?: string;
  status?: string;
  website?: string;
  contact_email?: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("clients");
  const [clients, setClients] = useState<ClientData[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [funnelCounts, setFunnelCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function fetchClients() {
      try {
        const res = await fetch("/api/clients");
        if (res.ok) {
          const data = await res.json();
          setClients(data);

          // Count funnels per client if the data has it,
          // otherwise leave counts empty
          const counts: Record<string, number> = {};
          for (const client of data) {
            counts[client.id] = client.funnel_count ?? 0;
          }
          setFunnelCounts(counts);
        }
      } catch (err) {
        console.error("Failed to fetch clients:", err);
      } finally {
        setClientsLoading(false);
      }
    }

    fetchClients();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
      <p className="text-slate-400 mb-6">
        Manage clients, configure funnels, and control integrations.
      </p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "clients" && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Clients</h2>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
              <Plus className="w-4 h-4" />
              Add Client
            </button>
          </div>
          {clientsLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Loading clients...
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800">
                <Inbox className="h-7 w-7 text-slate-500" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">
                No clients yet
              </h3>
              <p className="mt-1.5 max-w-sm text-center text-sm text-slate-400">
                Add your first client to get started.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left text-sm font-medium text-slate-400 p-4">
                    Name
                  </th>
                  <th className="text-left text-sm font-medium text-slate-400 p-4">
                    Industry
                  </th>
                  <th className="text-left text-sm font-medium text-slate-400 p-4">
                    Funnels
                  </th>
                  <th className="text-left text-sm font-medium text-slate-400 p-4">
                    Status
                  </th>
                  <th className="text-right text-sm font-medium text-slate-400 p-4">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr
                    key={client.id}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30"
                  >
                    <td className="p-4">
                      <p className="text-sm font-medium text-white">
                        {client.name}
                      </p>
                      <p className="text-xs text-slate-500">/{client.slug}</p>
                    </td>
                    <td className="p-4 text-sm text-slate-300">
                      {client.industry ?? "N/A"}
                    </td>
                    <td className="p-4 text-sm text-slate-300">
                      {funnelCounts[client.id] ?? 0}
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          client.status === "active"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-slate-500/20 text-slate-400"
                        }`}
                      >
                        {client.status ?? "active"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button className="text-sm text-blue-400 hover:text-blue-300">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === "config" && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Funnel Configuration
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            Select a client and funnel to configure stage baselines, thresholds,
            and automation rules.
          </p>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Client
              </label>
              <select className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm">
                {clients.length === 0 ? (
                  <option>No clients available</option>
                ) : (
                  clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Funnel
              </label>
              <select className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm">
                <option>Select a client first</option>
              </select>
            </div>
          </div>
          <div className="space-y-3">
            {[
              "Ad Click-Through Rate",
              "Landing Page Conversion",
              "Email Open Rate",
              "Booking Rate",
              "Close Rate",
            ].map((metric) => (
              <div
                key={metric}
                className="grid grid-cols-4 gap-4 items-center p-3 bg-slate-800/50 rounded-lg"
              >
                <span className="text-sm text-slate-300">{metric}</span>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Baseline
                  </label>
                  <input
                    type="text"
                    defaultValue="25%"
                    className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Warning
                  </label>
                  <input
                    type="text"
                    defaultValue="20%"
                    className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-yellow-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Critical
                  </label>
                  <input
                    type="text"
                    defaultValue="15%"
                    className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-red-400"
                  />
                </div>
              </div>
            ))}
          </div>
          <button className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
            Save Configuration
          </button>
        </div>
      )}

      {activeTab === "integrations" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map((integration) => (
            <div
              key={integration.name}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-white">
                  {integration.name}
                </h3>
                {integration.status === "connected" ? (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <CheckCircle className="w-3 h-3" /> Connected
                  </span>
                ) : integration.status === "error" ? (
                  <span className="flex items-center gap-1 text-xs text-red-400">
                    <XCircle className="w-3 h-3" /> Error
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <AlertCircle className="w-3 h-3" /> Not Configured
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mb-3">
                {integration.description}
              </p>
              <p className="text-xs text-slate-600 font-mono">
                {integration.envVar}
              </p>
            </div>
          ))}
        </div>
      )}

      {activeTab === "users" && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Users</h2>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
              <Plus className="w-4 h-4" />
              Invite User
            </button>
          </div>
          <div className="p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 mx-auto">
              <Users className="h-7 w-7 text-slate-500" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-white">
              User management coming soon
            </h3>
            <p className="mt-1.5 max-w-sm mx-auto text-center text-sm text-slate-400">
              User roles and permissions will be managed here once authentication is configured.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
