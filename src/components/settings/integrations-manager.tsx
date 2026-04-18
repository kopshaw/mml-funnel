"use client";

import { useState } from "react";
import {
  Building2, Plug, Check, X, AlertTriangle, Loader2,
  RefreshCw, Trash2, Key,
} from "lucide-react";

interface IntegrationRow {
  integration_type: string;
  status: string;
  metadata: Record<string, unknown>;
  last_validated_at: string | null;
  last_error: string | null;
  connected_at: string | null;
}

interface Client {
  id: string;
  name: string;
  slug: string;
}

interface IntegrationSpec {
  type:
    | "anthropic" | "openai" | "deepseek"
    | "resend" | "twilio" | "meta_ads"
    | "stripe" | "ghl" | "unsplash";
  label: string;
  description: string;
  icon: string;
  category: "ai" | "messaging" | "ads" | "payments" | "crm" | "media";
  fields: Array<{
    key: string;
    label: string;
    type?: "text" | "password";
    placeholder?: string;
    required?: boolean;
    hint?: string;
  }>;
  metadata_fields?: Array<{
    key: string;
    label: string;
    placeholder?: string;
    hint?: string;
  }>;
}

const INTEGRATIONS: IntegrationSpec[] = [
  {
    type: "anthropic",
    label: "Anthropic (Claude)",
    description: "Primary AI provider — content generation, research, sales agent",
    icon: "🤖",
    category: "ai",
    fields: [{ key: "api_key", label: "API Key", type: "password", placeholder: "sk-ant-api03-...", required: true, hint: "console.anthropic.com → API keys" }],
  },
  {
    type: "openai",
    label: "OpenAI (GPT)",
    description: "Fallback AI provider — lower-cost tier for high-volume copy",
    icon: "🧠",
    category: "ai",
    fields: [{ key: "api_key", label: "API Key", type: "password", placeholder: "sk-proj-...", required: true, hint: "platform.openai.com → API keys" }],
  },
  {
    type: "deepseek",
    label: "DeepSeek",
    description: "Cheapest AI option — CFO agent auto-switches here on budget overrun",
    icon: "🐋",
    category: "ai",
    fields: [{ key: "api_key", label: "API Key", type: "password", placeholder: "sk-...", required: true, hint: "platform.deepseek.com → API keys" }],
  },
  {
    type: "resend",
    label: "Resend",
    description: "Transactional email delivery for nurture sequences",
    icon: "✉️",
    category: "messaging",
    fields: [{ key: "api_key", label: "API Key", type: "password", placeholder: "re_...", required: true, hint: "resend.com → API Keys" }],
    metadata_fields: [
      { key: "from_address", label: "From address", placeholder: "Your Name <hello@yourdomain.com>", hint: "Your verified Resend sender — will be used as the From line on all emails" },
    ],
  },
  {
    type: "twilio",
    label: "Twilio",
    description: "SMS delivery for text follow-up sequences",
    icon: "💬",
    category: "messaging",
    fields: [
      { key: "account_sid", label: "Account SID", placeholder: "AC...", required: true },
      { key: "auth_token", label: "Auth Token", type: "password", required: true },
      { key: "phone_number", label: "Phone Number", placeholder: "+15551234567", required: true, hint: "Your Twilio-owned number in E.164 format" },
    ],
  },
  {
    type: "meta_ads",
    label: "Meta Ads",
    description: "Facebook & Instagram ad management for the self-healing engine",
    icon: "📣",
    category: "ads",
    fields: [
      { key: "access_token", label: "Access Token", type: "password", required: true, hint: "System User token with ads_management + ads_read scopes" },
      { key: "ad_account_id", label: "Ad Account ID", placeholder: "act_1234567890", required: true },
      { key: "app_id", label: "App ID (optional)" },
      { key: "app_secret", label: "App Secret (optional)", type: "password" },
    ],
  },
  {
    type: "stripe",
    label: "Stripe",
    description: "Payment processing & revenue tracking for the pipeline",
    icon: "💳",
    category: "payments",
    fields: [
      { key: "secret_key", label: "Secret Key", type: "password", placeholder: "sk_live_... or sk_test_...", required: true },
      { key: "publishable_key", label: "Publishable Key", placeholder: "pk_live_... or pk_test_..." },
      { key: "webhook_secret", label: "Webhook Secret", type: "password", placeholder: "whsec_..." },
    ],
  },
  {
    type: "ghl",
    label: "GoHighLevel",
    description: "CRM contact sync — push qualified leads into your GHL pipeline",
    icon: "📇",
    category: "crm",
    fields: [
      { key: "api_key", label: "API Key", type: "password", required: true },
      { key: "location_id", label: "Location ID", required: true },
    ],
  },
  {
    type: "unsplash",
    label: "Unsplash",
    description: "Stock photography for landing page hero + section imagery",
    icon: "📸",
    category: "media",
    fields: [{ key: "access_key", label: "Access Key", type: "password", required: true, hint: "unsplash.com/developers → Create app → Access Key" }],
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  ai: "AI",
  messaging: "Messaging",
  ads: "Advertising",
  payments: "Payments",
  crm: "CRM",
  media: "Media",
};

export function IntegrationsManager({
  client,
  initial,
}: {
  client: Client;
  initial: IntegrationRow[];
}) {
  const [rows, setRows] = useState<IntegrationRow[]>(initial);

  function getRow(type: string): IntegrationRow | undefined {
    return rows.find((r) => r.integration_type === type);
  }

  async function refresh() {
    const res = await fetch(`/api/clients/integrations?client_id=${client.id}`);
    if (!res.ok) return;
    const data = await res.json();
    setRows(data.integrations ?? []);
  }

  // Group by category
  const byCategory: Record<string, IntegrationSpec[]> = {};
  for (const spec of INTEGRATIONS) {
    if (!byCategory[spec.category]) byCategory[spec.category] = [];
    byCategory[spec.category].push(spec);
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-2">
        <Building2 className="w-5 h-5 text-blue-400" />
        <h2 className="text-lg font-semibold text-white">{client.name}</h2>
        <span className="text-xs text-slate-500 ml-auto">
          {rows.filter((r) => r.status === "connected").length} / {INTEGRATIONS.length} connected
        </span>
      </div>

      <div className="divide-y divide-slate-800">
        {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
          <div key={cat} className="px-6 py-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              {label}
            </h3>
            <div className="space-y-2">
              {(byCategory[cat] ?? []).map((spec) => (
                <IntegrationRowCard
                  key={spec.type}
                  spec={spec}
                  row={getRow(spec.type)}
                  clientId={client.id}
                  onChange={refresh}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Single integration row
// ---------------------------------------------------------------------

function IntegrationRowCard({
  spec,
  row,
  clientId,
  onChange,
}: {
  spec: IntegrationSpec;
  row: IntegrationRow | undefined;
  clientId: string;
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const status = row?.status ?? "not_connected";
  const isConnected = status === "connected";
  const isError = status === "error";

  async function save() {
    setSaving(true);
    setErr(null);
    setOkMsg(null);
    try {
      const res = await fetch("/api/clients/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          integration_type: spec.type,
          credentials: formData,
          metadata,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      if (data.ok) {
        setOkMsg(data.message ?? "Connected");
        setFormData({});
        setOpen(false);
      } else {
        setErr(data.message ?? data.error ?? "Validation failed");
      }
      onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    setTesting(true);
    setErr(null);
    setOkMsg(null);
    try {
      const res = await fetch("/api/clients/integrations?action=test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, integration_type: spec.type }),
      });
      const data = await res.json();
      if (data.ok) setOkMsg("Credentials valid");
      else setErr(data.error ?? "Test failed");
      onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setTesting(false);
    }
  }

  async function disconnect() {
    if (!confirm(`Disconnect ${spec.label}?`)) return;
    await fetch(
      `/api/clients/integrations?client_id=${clientId}&type=${spec.type}`,
      { method: "DELETE" }
    );
    setOpen(false);
    setFormData({});
    onChange();
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-900/50 transition-colors"
      >
        <span className="text-2xl shrink-0">{spec.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{spec.label}</span>
            <StatusBadge status={status} />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{spec.description}</p>
        </div>
        <span className="shrink-0 text-xs text-slate-400">
          {open ? "Close" : isConnected ? "Manage" : "Connect"}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-slate-800 pt-4 space-y-3">
          {row?.last_error && !okMsg && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Last validation failed</p>
                <p className="mt-1">{row.last_error}</p>
              </div>
            </div>
          )}

          {okMsg && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              {okMsg}
            </div>
          )}

          {err && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{err}</p>
            </div>
          )}

          <div className="space-y-3">
            {spec.fields.map((field) => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  {field.label}
                  {field.required && <span className="text-red-400 ml-1">*</span>}
                </label>
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-slate-600 shrink-0" />
                  <input
                    type={field.type ?? "text"}
                    placeholder={isConnected ? "•••••••••••• (saved)" : field.placeholder}
                    value={formData[field.key] ?? ""}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, [field.key]: e.target.value }))
                    }
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                {field.hint && (
                  <p className="text-[11px] text-slate-500 mt-1 ml-6">{field.hint}</p>
                )}
              </div>
            ))}

            {spec.metadata_fields?.map((field) => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  {field.label}
                </label>
                <input
                  type="text"
                  placeholder={field.placeholder}
                  value={metadata[field.key] ?? ""}
                  onChange={(e) =>
                    setMetadata((m) => ({ ...m, [field.key]: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                {field.hint && (
                  <p className="text-[11px] text-slate-500 mt-1">{field.hint}</p>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={save}
              disabled={saving || Object.keys(formData).length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {isConnected ? "Update & Validate" : "Connect & Validate"}
            </button>

            {isConnected && (
              <button
                onClick={test}
                disabled={testing}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-slate-700 hover:border-slate-600 text-slate-200 rounded-lg transition-colors"
              >
                {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Test
              </button>
            )}

            {(isConnected || isError || row) && (
              <button
                onClick={disconnect}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Disconnect
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    connected: {
      label: "Connected",
      className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      icon: <Check className="w-3 h-3" />,
    },
    pending: {
      label: "Pending",
      className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
    },
    error: {
      label: "Error",
      className: "bg-red-500/15 text-red-400 border-red-500/30",
      icon: <AlertTriangle className="w-3 h-3" />,
    },
    expired: {
      label: "Expired",
      className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      icon: <AlertTriangle className="w-3 h-3" />,
    },
    revoked: {
      label: "Disconnected",
      className: "bg-slate-500/15 text-slate-400 border-slate-500/30",
      icon: <X className="w-3 h-3" />,
    },
    not_connected: {
      label: "Not connected",
      className: "bg-slate-500/10 text-slate-500 border-slate-500/20",
      icon: <Plug className="w-3 h-3" />,
    },
  };
  const s = map[status] ?? map.not_connected;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${s.className}`}
    >
      {s.icon}
      {s.label}
    </span>
  );
}
