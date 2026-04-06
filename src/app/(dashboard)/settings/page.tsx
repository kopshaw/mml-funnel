"use client";

import { useState } from "react";
import { Building2, Sliders, Plug, Users, Plus, CheckCircle, XCircle, AlertCircle } from "lucide-react";

const tabs = [
  { id: "clients", label: "Clients", icon: Building2 },
  { id: "config", label: "Funnel Config", icon: Sliders },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "users", label: "Users", icon: Users },
];

const mockClients = [
  { id: "1", name: "Metric Mentor Labs", slug: "mml", industry: "Business Consulting", status: "active", funnels: 4 },
  { id: "2", name: "TechStart Inc", slug: "techstart", industry: "SaaS", status: "active", funnels: 2 },
  { id: "3", name: "GrowthCo", slug: "growthco", industry: "Marketing Agency", status: "active", funnels: 3 },
  { id: "4", name: "BrandHaus", slug: "brandhaus", industry: "E-commerce", status: "inactive", funnels: 1 },
];

const integrations = [
  { name: "Supabase", description: "Database & Auth", status: "connected", envVar: "NEXT_PUBLIC_SUPABASE_URL" },
  { name: "Claude API", description: "AI Reasoning", status: "connected", envVar: "ANTHROPIC_API_KEY" },
  { name: "Meta Ads", description: "Ad Management", status: "not_configured", envVar: "META_ACCESS_TOKEN" },
  { name: "Resend", description: "Email Sending", status: "not_configured", envVar: "RESEND_API_KEY" },
  { name: "Twilio", description: "SMS Messaging", status: "not_configured", envVar: "TWILIO_ACCOUNT_SID" },
  { name: "Stripe", description: "Payments", status: "not_configured", envVar: "STRIPE_SECRET_KEY" },
  { name: "GoHighLevel", description: "CRM Bridge", status: "not_configured", envVar: "GHL_API_KEY" },
];

const mockUsers = [
  { id: "1", name: "Steve Kopshaw", email: "steve@metricmentorlabs.com", role: "admin", clients: "All", lastActive: "Now" },
  { id: "2", name: "Client Viewer", email: "viewer@techstart.io", role: "client_viewer", clients: "TechStart Inc", lastActive: "2 days ago" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("clients");

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
      <p className="text-slate-400 mb-6">Manage clients, configure funnels, and control integrations.</p>

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
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left text-sm font-medium text-slate-400 p-4">Name</th>
                <th className="text-left text-sm font-medium text-slate-400 p-4">Industry</th>
                <th className="text-left text-sm font-medium text-slate-400 p-4">Funnels</th>
                <th className="text-left text-sm font-medium text-slate-400 p-4">Status</th>
                <th className="text-right text-sm font-medium text-slate-400 p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockClients.map((client) => (
                <tr key={client.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="p-4">
                    <p className="text-sm font-medium text-white">{client.name}</p>
                    <p className="text-xs text-slate-500">/{client.slug}</p>
                  </td>
                  <td className="p-4 text-sm text-slate-300">{client.industry}</td>
                  <td className="p-4 text-sm text-slate-300">{client.funnels}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      client.status === "active" ? "bg-green-500/20 text-green-400" : "bg-slate-500/20 text-slate-400"
                    }`}>
                      {client.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-sm text-blue-400 hover:text-blue-300">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "config" && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Funnel Configuration</h2>
          <p className="text-sm text-slate-400 mb-6">
            Select a client and funnel to configure stage baselines, thresholds, and automation rules.
          </p>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Client</label>
              <select className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm">
                <option>Metric Mentor Labs</option>
                <option>TechStart Inc</option>
                <option>GrowthCo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Funnel</label>
              <select className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm">
                <option>VSL High-Ticket Closer</option>
                <option>Webinar Ops Accelerator</option>
              </select>
            </div>
          </div>
          <div className="space-y-3">
            {["Ad Click-Through Rate", "Landing Page Conversion", "Email Open Rate", "Booking Rate", "Close Rate"].map((metric) => (
              <div key={metric} className="grid grid-cols-4 gap-4 items-center p-3 bg-slate-800/50 rounded-lg">
                <span className="text-sm text-slate-300">{metric}</span>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Baseline</label>
                  <input type="text" defaultValue="25%" className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Warning</label>
                  <input type="text" defaultValue="20%" className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-yellow-400" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Critical</label>
                  <input type="text" defaultValue="15%" className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-red-400" />
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
            <div key={integration.name} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-white">{integration.name}</h3>
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
              <p className="text-xs text-slate-400 mb-3">{integration.description}</p>
              <p className="text-xs text-slate-600 font-mono">{integration.envVar}</p>
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
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left text-sm font-medium text-slate-400 p-4">Name</th>
                <th className="text-left text-sm font-medium text-slate-400 p-4">Email</th>
                <th className="text-left text-sm font-medium text-slate-400 p-4">Role</th>
                <th className="text-left text-sm font-medium text-slate-400 p-4">Clients</th>
                <th className="text-left text-sm font-medium text-slate-400 p-4">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {mockUsers.map((user) => (
                <tr key={user.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="p-4 text-sm font-medium text-white">{user.name}</td>
                  <td className="p-4 text-sm text-slate-300">{user.email}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      user.role === "admin" ? "bg-purple-500/20 text-purple-400" : "bg-slate-500/20 text-slate-400"
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-300">{user.clients}</td>
                  <td className="p-4 text-sm text-slate-500">{user.lastActive}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
