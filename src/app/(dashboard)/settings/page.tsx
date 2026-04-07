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
  Shield,
  Eye,
  X,
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

interface UserAssignment {
  id: string;
  role: string;
  client_id: string;
  client_name: string;
  client_slug: string;
}

interface UserData {
  id: string;
  email: string;
  full_name: string | null;
  last_sign_in_at: string | null;
  auth_created_at: string | null;
  assignments: UserAssignment[];
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("clients");
  const [clients, setClients] = useState<ClientData[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [funnelCounts, setFunnelCounts] = useState<Record<string, number>>({});
  const [users, setUsers] = useState<UserData[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    full_name: "",
    role: "client_viewer",
    client_id: "",
    password: "",
  });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");

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

    async function fetchUsers() {
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (err) {
        console.error("Failed to fetch users:", err);
      } finally {
        setUsersLoading(false);
      }
    }

    fetchUsers();
  }, []);

  async function handleInviteUser(e: React.FormEvent) {
    e.preventDefault();
    setInviteLoading(true);
    setInviteError("");

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });

      if (!res.ok) {
        const data = await res.json();
        setInviteError(data.error || "Failed to invite user");
        return;
      }

      // Refresh user list
      const usersRes = await fetch("/api/users");
      if (usersRes.ok) setUsers(await usersRes.json());

      setShowInviteModal(false);
      setInviteForm({
        email: "",
        full_name: "",
        role: "client_viewer",
        client_id: "",
        password: "",
      });
    } catch {
      setInviteError("Network error");
    } finally {
      setInviteLoading(false);
    }
  }

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
        <>
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">
                Users &amp; Permissions
              </h2>
              <button
                onClick={() => {
                  setShowInviteModal(true);
                  setInviteForm((f) => ({
                    ...f,
                    client_id: clients[0]?.id ?? "",
                  }));
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Invite User
              </button>
            </div>
            {usersLoading ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Loading users...
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800">
                  <Users className="h-7 w-7 text-slate-500" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">
                  No users yet
                </h3>
                <p className="mt-1.5 max-w-sm text-center text-sm text-slate-400">
                  Invite team members to get started.
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left text-sm font-medium text-slate-400 p-4">
                      User
                    </th>
                    <th className="text-left text-sm font-medium text-slate-400 p-4">
                      Clients &amp; Roles
                    </th>
                    <th className="text-left text-sm font-medium text-slate-400 p-4">
                      Last Sign In
                    </th>
                    <th className="text-left text-sm font-medium text-slate-400 p-4">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-slate-800/50 hover:bg-slate-800/30"
                    >
                      <td className="p-4">
                        <p className="text-sm font-medium text-white">
                          {user.full_name || user.email.split("@")[0]}
                        </p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5">
                          {user.assignments.map((a) => (
                            <span
                              key={a.id}
                              className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                                a.role === "admin"
                                  ? "bg-amber-500/20 text-amber-400"
                                  : "bg-slate-500/20 text-slate-400"
                              }`}
                            >
                              {a.role === "admin" ? (
                                <Shield className="w-3 h-3" />
                              ) : (
                                <Eye className="w-3 h-3" />
                              )}
                              {a.client_name}
                              <span className="text-[10px] opacity-60">
                                ({a.role === "admin" ? "Admin" : "Viewer"})
                              </span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-400">
                        {user.last_sign_in_at
                          ? new Date(user.last_sign_in_at).toLocaleDateString()
                          : "Never"}
                      </td>
                      <td className="p-4 text-sm text-slate-400">
                        {user.auth_created_at
                          ? new Date(
                              user.auth_created_at
                            ).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Invite User Modal */}
          {showInviteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
              <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    Invite User
                  </h3>
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleInviteUser} className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={inviteForm.email}
                      onChange={(e) =>
                        setInviteForm((f) => ({
                          ...f,
                          email: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={inviteForm.full_name}
                      onChange={(e) =>
                        setInviteForm((f) => ({
                          ...f,
                          full_name: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">
                      Temporary Password
                    </label>
                    <input
                      type="text"
                      value={inviteForm.password}
                      onChange={(e) =>
                        setInviteForm((f) => ({
                          ...f,
                          password: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                      placeholder="Temporary password for new user"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">
                        Assign to Client
                      </label>
                      <select
                        required
                        value={inviteForm.client_id}
                        onChange={(e) =>
                          setInviteForm((f) => ({
                            ...f,
                            client_id: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                      >
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">
                        Role
                      </label>
                      <select
                        value={inviteForm.role}
                        onChange={(e) =>
                          setInviteForm((f) => ({
                            ...f,
                            role: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                      >
                        <option value="admin">Admin</option>
                        <option value="client_viewer">Viewer</option>
                      </select>
                    </div>
                  </div>
                  {inviteError && (
                    <p className="text-sm text-red-400">{inviteError}</p>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowInviteModal(false)}
                      className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 text-sm rounded-lg hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={inviteLoading}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                    >
                      {inviteLoading ? "Inviting..." : "Invite User"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
