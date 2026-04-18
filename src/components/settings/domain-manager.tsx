"use client";

import { useState } from "react";
import {
  Globe, Pencil, Check, AlertTriangle, Copy, Trash2, ExternalLink,
  Loader2, RefreshCw, Shield, X,
} from "lucide-react";

interface Client {
  id: string;
  name: string;
  slug: string;
  subdomain: string | null;
  custom_domain: string | null;
  custom_domain_status: string | null;
  custom_domain_verified_at: string | null;
  custom_domain_error: string | null;
  custom_domain_verification_token: string | null;
}

export function DomainManager({ client: initial }: { client: Client }) {
  const [client, setClient] = useState(initial);
  const [editingSubdomain, setEditingSubdomain] = useState(false);
  const [subdomainInput, setSubdomainInput] = useState(client.subdomain ?? "");
  const [savingSubdomain, setSavingSubdomain] = useState(false);
  const [subdomainErr, setSubdomainErr] = useState<string | null>(null);

  const [addingCustom, setAddingCustom] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [addingCustomErr, setAddingCustomErr] = useState<string | null>(null);
  const [savingCustom, setSavingCustom] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyErr, setVerifyErr] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const subdomainUrl = client.subdomain
    ? `https://${client.subdomain}.sophiafunnels.com`
    : null;

  const customUrl = client.custom_domain ? `https://${client.custom_domain}` : null;

  async function saveSubdomain() {
    setSavingSubdomain(true);
    setSubdomainErr(null);
    try {
      const res = await fetch("/api/clients/domains", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: client.id, subdomain: subdomainInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setClient({ ...client, subdomain: data.subdomain });
      setEditingSubdomain(false);
    } catch (err) {
      setSubdomainErr(err instanceof Error ? err.message : "Failed");
    } finally {
      setSavingSubdomain(false);
    }
  }

  async function addCustomDomain() {
    setSavingCustom(true);
    setAddingCustomErr(null);
    try {
      const res = await fetch("/api/clients/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: client.id, custom_domain: customInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      // Refetch fresh client data
      const fresh = await fetch(`/api/clients/domains?client_id=${client.id}`);
      const freshData = await fresh.json();
      setClient(freshData.client);
      setAddingCustom(false);
      setCustomInput("");
    } catch (err) {
      setAddingCustomErr(err instanceof Error ? err.message : "Failed");
    } finally {
      setSavingCustom(false);
    }
  }

  async function runVerify() {
    setVerifying(true);
    setVerifyErr(null);
    try {
      const res = await fetch("/api/clients/domains?action=verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: client.id }),
      });
      const data = await res.json();
      const fresh = await fetch(`/api/clients/domains?client_id=${client.id}`);
      const freshData = await fresh.json();
      setClient(freshData.client);
      if (!data.ok) {
        setVerifyErr(data.details ?? data.reason ?? "Verification failed");
      }
    } catch (err) {
      setVerifyErr(err instanceof Error ? err.message : "Failed");
    } finally {
      setVerifying(false);
    }
  }

  async function removeDomain() {
    if (!confirm(`Remove ${client.custom_domain}? Your funnels will no longer be accessible at this URL.`)) return;
    setRemoving(true);
    try {
      await fetch(`/api/clients/domains?client_id=${client.id}`, { method: "DELETE" });
      setClient({
        ...client,
        custom_domain: null,
        custom_domain_status: null,
        custom_domain_error: null,
        custom_domain_verification_token: null,
      });
    } catch {
      // ignore
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
      {/* Workspace header */}
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">{client.name}</h2>
          <span className="text-xs text-slate-500">workspace</span>
        </div>
      </div>

      {/* Subdomain block */}
      <div className="px-6 py-5 border-b border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Subdomain</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Your default URL on sophiafunnels.com. Free, always on.
            </p>
          </div>
          {!editingSubdomain && (
            <button
              onClick={() => setEditingSubdomain(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
          )}
        </div>

        {editingSubdomain ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-lg overflow-hidden">
              <input
                type="text"
                value={subdomainInput}
                onChange={(e) => setSubdomainInput(e.target.value.toLowerCase())}
                placeholder="workspace"
                className="flex-1 px-3 py-2 bg-transparent text-white placeholder-slate-500 focus:outline-none"
              />
              <span className="px-3 text-sm text-slate-500 bg-slate-800 py-2">
                .sophiafunnels.com
              </span>
            </div>
            {subdomainErr && (
              <p className="text-xs text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> {subdomainErr}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={saveSubdomain}
                disabled={savingSubdomain || !subdomainInput}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {savingSubdomain ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save
              </button>
              <button
                onClick={() => {
                  setEditingSubdomain(false);
                  setSubdomainInput(client.subdomain ?? "");
                  setSubdomainErr(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <code className="flex-1 px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono">
              {subdomainUrl ?? "Not set"}
            </code>
            {subdomainUrl && (
              <a
                href={subdomainUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-400 hover:text-blue-400 transition-colors"
              >
                Open
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Custom domain block */}
      <div className="px-6 py-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Custom domain</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Connect your own domain (e.g., funnels.yourcompany.com). Recommended for branded funnels.
            </p>
          </div>
        </div>

        {!client.custom_domain && !addingCustom && (
          <button
            onClick={() => setAddingCustom(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-slate-700 hover:border-slate-600 text-slate-200 rounded-lg transition-colors"
          >
            + Add custom domain
          </button>
        )}

        {addingCustom && (
          <div className="space-y-3">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value.toLowerCase())}
              placeholder="funnels.yourcompany.com"
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            {addingCustomErr && (
              <p className="text-xs text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> {addingCustomErr}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={addCustomDomain}
                disabled={savingCustom || !customInput}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {savingCustom ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Add
              </button>
              <button
                onClick={() => {
                  setAddingCustom(false);
                  setCustomInput("");
                  setAddingCustomErr(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {client.custom_domain && (
          <div className="space-y-4">
            {/* Domain + status */}
            <div className="flex items-center gap-3 flex-wrap">
              <code className="flex-1 min-w-0 px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono truncate">
                {client.custom_domain}
              </code>
              <StatusBadge status={client.custom_domain_status} />
              {client.custom_domain_status === "verified" && customUrl && (
                <a
                  href={customUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-emerald-400 hover:text-emerald-300"
                >
                  Open
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Setup instructions */}
            {client.custom_domain_status !== "verified" && (
              <div className="rounded-lg border border-slate-700 bg-slate-950 p-4 space-y-4">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Point your DNS to sophiafunnels.com
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Add this CNAME record at your DNS provider (Cloudflare, Namecheap, Google
                      Domains, etc.), then click Verify below. DNS changes can take a few minutes
                      to propagate.
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800 overflow-hidden">
                  <table className="w-full text-xs font-mono">
                    <thead className="bg-slate-900">
                      <tr>
                        <th className="px-3 py-2 text-left text-slate-400">Type</th>
                        <th className="px-3 py-2 text-left text-slate-400">Host / Name</th>
                        <th className="px-3 py-2 text-left text-slate-400">Points to / Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-slate-800">
                        <td className="px-3 py-2 text-blue-400 font-semibold">CNAME</td>
                        <td className="px-3 py-2 text-slate-200">{client.custom_domain}</td>
                        <td className="px-3 py-2 text-slate-200 flex items-center gap-2">
                          sophiafunnels.com
                          <CopyButton value="sophiafunnels.com" />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {client.custom_domain_verification_token && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-slate-400 hover:text-slate-200">
                      Apex domain? Use TXT verification instead
                    </summary>
                    <div className="mt-2 rounded-lg border border-slate-800 overflow-hidden">
                      <table className="w-full font-mono">
                        <thead className="bg-slate-900">
                          <tr>
                            <th className="px-3 py-2 text-left text-slate-400">Type</th>
                            <th className="px-3 py-2 text-left text-slate-400">Host</th>
                            <th className="px-3 py-2 text-left text-slate-400">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t border-slate-800">
                            <td className="px-3 py-2 text-blue-400 font-semibold">TXT</td>
                            <td className="px-3 py-2 text-slate-200">
                              _sophia-verify.{client.custom_domain}
                            </td>
                            <td className="px-3 py-2 text-slate-200 flex items-center gap-2">
                              <span className="truncate">{client.custom_domain_verification_token}</span>
                              <CopyButton value={client.custom_domain_verification_token} />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </details>
                )}

                {(client.custom_domain_error || verifyErr) && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Verification failed</p>
                      <p className="mt-1">{verifyErr ?? client.custom_domain_error}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={runVerify}
                    disabled={verifying}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
                  >
                    {verifying ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    {verifying ? "Verifying..." : "Verify DNS"}
                  </button>
                  <button
                    onClick={removeDomain}
                    disabled={removing}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              </div>
            )}

            {client.custom_domain_status === "verified" && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-300">
                      Domain verified and active
                    </p>
                    <p className="text-xs text-emerald-200/80 mt-0.5">
                      Verified {client.custom_domain_verified_at
                        ? new Date(client.custom_domain_verified_at).toLocaleString()
                        : ""}
                    </p>
                  </div>
                </div>
                <button
                  onClick={removeDomain}
                  disabled={removing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove domain
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const map: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    pending: {
      label: "Awaiting DNS",
      className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      icon: <RefreshCw className="w-3 h-3" />,
    },
    verifying: {
      label: "Verifying",
      className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
    },
    verified: {
      label: "Verified",
      className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      icon: <Check className="w-3 h-3" />,
    },
    failed: {
      label: "DNS not found",
      className: "bg-red-500/15 text-red-400 border-red-500/30",
      icon: <AlertTriangle className="w-3 h-3" />,
    },
    revoked: {
      label: "Revoked",
      className: "bg-slate-500/15 text-slate-400 border-slate-500/30",
      icon: <X className="w-3 h-3" />,
    },
  };
  const s = status ? map[status] : null;
  if (!s) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${s.className}`}
    >
      {s.icon}
      {s.label}
    </span>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-slate-500 hover:text-white transition-colors"
      aria-label="Copy"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}
