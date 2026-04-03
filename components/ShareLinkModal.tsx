// components/ShareLinkModal.tsx
"use client";
import { useEffect, useState } from "react";

interface FileInfo {
  id: string;
  originalName: string;
}

interface ShareLink {
  id: string;
  token: string;
  shareUrl: string;
  expiresAt: string | null;
  maxUses: number | null;
  useCount: number;
  createdAt: string;
}

interface Props {
  file: FileInfo | null;
  onClose: () => void;
}

const EXPIRY_OPTIONS = [
  { label: "1 hour",   value: "1h" },
  { label: "24 hours", value: "24h" },
  { label: "7 days",   value: "7d" },
  { label: "30 days",  value: "30d" },
  { label: "Never",    value: "never" },
];

export function ShareLinkModal({ file, onClose }: Props) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expiresIn, setExpiresIn] = useState("7d");
  const [maxUses, setMaxUses] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;
    setLoading(true);
    fetch(`/api/files/${file.id}/share`)
      .then((r) => r.json())
      .then((d) => setLinks(d.links ?? []))
      .finally(() => setLoading(false));
  }, [file]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!file) return null;

  const createLink = async () => {
    setCreating(true);
    const res = await fetch(`/api/files/${file.id}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expiresIn,
        maxUses: maxUses ? parseInt(maxUses) : undefined,
      }),
    });
    const data = await res.json();
    setLinks((prev) => [data.link, ...prev]);
    setCreating(false);
  };

  const revokeLink = async (token: string) => {
    await fetch(`/api/files/${file.id}/share`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    setLinks((prev) => prev.filter((l) => l.token !== token));
  };

  const copyLink = (url: string, token: string) => {
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-zinc-900 rounded-2xl border border-zinc-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div>
            <h2 className="font-semibold text-zinc-100">Share File</h2>
            <p className="text-xs text-zinc-500 truncate mt-0.5">{file.originalName}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 text-lg leading-none">✕</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Create new link */}
          <div className="space-y-3">
            <h3 className="text-xs uppercase tracking-widest text-zinc-500">Create link</h3>
            <div className="flex gap-2">
              <div className="flex-1 space-y-2">
                <label className="text-xs text-zinc-400">Expires in</label>
                <select
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500"
                >
                  {EXPIRY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="w-28 space-y-2">
                <label className="text-xs text-zinc-400">Max uses</label>
                <input
                  type="number"
                  min="1"
                  placeholder="∞"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <button
              onClick={createLink}
              disabled={creating}
              className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-medium text-white transition-colors"
            >
              {creating ? "Creating…" : "Generate link"}
            </button>
          </div>

          {/* Existing links */}
          {links.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs uppercase tracking-widest text-zinc-500">Active links</h3>
              {loading ? (
                <div className="text-xs text-zinc-600 animate-pulse">Loading…</div>
              ) : (
                links.map((link) => {
                  const expired = link.expiresAt && new Date(link.expiresAt) < new Date();
                  const maxed = link.maxUses !== null && link.useCount >= link.maxUses;
                  const invalid = expired || maxed;

                  return (
                    <div
                      key={link.token}
                      className={`rounded-xl border p-3 space-y-2 ${invalid ? "border-zinc-800 opacity-60" : "border-zinc-700"}`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          readOnly
                          value={link.shareUrl}
                          className="flex-1 bg-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-300 font-mono outline-none truncate"
                        />
                        <button
                          onClick={() => copyLink(link.shareUrl, link.token)}
                          className="shrink-0 px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-xs text-zinc-200 transition-colors"
                        >
                          {copied === link.token ? "✓ Copied" : "Copy"}
                        </button>
                        <button
                          onClick={() => revokeLink(link.token)}
                          className="shrink-0 p-1.5 rounded-lg hover:bg-red-950 text-zinc-500 hover:text-red-400 transition-colors text-xs"
                          title="Revoke link"
                        >✕</button>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-600">
                        {link.expiresAt ? (
                          <span>{expired ? "⏰ Expired" : `Expires ${new Date(link.expiresAt).toLocaleDateString()}`}</span>
                        ) : (
                          <span>Never expires</span>
                        )}
                        {link.maxUses && (
                          <span>{link.useCount}/{link.maxUses} uses</span>
                        )}
                        {invalid && <span className="text-red-500">Inactive</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}