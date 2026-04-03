// app/(dashboard)/dashboard/shared/page.tsx
"use client";
import { useEffect, useState } from "react";
import { formatBytes, fileIcon, timeAgo } from "@/lib/utils";

interface SharedLink {
  id: string;
  token: string;
  shareUrl: string;
  expiresAt: string | null;
  maxUses: number | null;
  useCount: number;
  createdAt: string;
  file: {
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
  };
}

export default function SharedPage() {
  const [links, setLinks] = useState<SharedLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/share/all")
      .then((r) => r.json())
      .then((d) => setLinks(d.links ?? []))
      .finally(() => setLoading(false));
  }, []);

  const revoke = async (token: string, fileId: string) => {
    if (!confirm("Revoke this link?")) return;
    await fetch(`/api/files/${fileId}/share`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    setLinks((prev) => prev.filter((l) => l.token !== token));
  };

  const copy = (url: string, token: string) => {
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  const activeLinks = links.filter((l) => {
    if (l.expiresAt && new Date(l.expiresAt) < new Date()) return false;
    if (l.maxUses !== null && l.useCount >= l.maxUses) return false;
    return true;
  });

  const expiredLinks = links.filter((l) => {
    if (l.expiresAt && new Date(l.expiresAt) < new Date()) return true;
    if (l.maxUses !== null && l.useCount >= l.maxUses) return true;
    return false;
  });

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shared Links</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Manage all public links to your files
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm font-mono">
          <span className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            {activeLinks.length} active
          </span>
          {expiredLinks.length > 0 && (
            <span className="px-2 py-1 rounded-lg bg-zinc-800 border border-[#1e2d45] text-zinc-500">
              {expiredLinks.length} expired
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <SkeletonLinks />
      ) : links.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
          <div className="text-5xl opacity-30">🔗</div>
          <p className="text-zinc-400">No shared links yet</p>
          <p className="text-sm text-zinc-600">
            Open any file and click the share button to create a link
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active */}
          {activeLinks.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs uppercase tracking-widest text-zinc-500 font-mono">Active</h2>
              <div className="space-y-2">
                {activeLinks.map((link) => (
                  <LinkRow
                    key={link.token}
                    link={link}
                    onCopy={() => copy(link.shareUrl, link.token)}
                    onRevoke={() => revoke(link.token, link.file.id)}
                    copied={copied === link.token}
                    active
                  />
                ))}
              </div>
            </section>
          )}

          {/* Expired */}
          {expiredLinks.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs uppercase tracking-widest text-zinc-500 font-mono">Expired / Maxed out</h2>
              <div className="space-y-2 opacity-60">
                {expiredLinks.map((link) => (
                  <LinkRow
                    key={link.token}
                    link={link}
                    onCopy={() => copy(link.shareUrl, link.token)}
                    onRevoke={() => revoke(link.token, link.file.id)}
                    copied={copied === link.token}
                    active={false}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function LinkRow({ link, onCopy, onRevoke, copied, active }: {
  link: SharedLink;
  onCopy: () => void;
  onRevoke: () => void;
  copied: boolean;
  active: boolean;
}) {
  const expires = link.expiresAt ? new Date(link.expiresAt) : null;

  return (
    <div className={`rounded-xl border p-4 space-y-3 transition-colors
      ${active ? "border-[#1e2d45] bg-[#0d1220] hover:bg-[#111827]" : "border-[#1a1f2e] bg-[#0a0e18]"}`}
    >
      {/* File info */}
      <div className="flex items-center gap-3">
        <span className="text-xl">{fileIcon(link.file.mimeType)}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-200 truncate">{link.file.originalName}</p>
          <p className="text-xs text-zinc-600 font-mono">{formatBytes(link.file.size)}</p>
        </div>
        <div className="text-xs text-zinc-600 font-mono hidden sm:block">
          Created {timeAgo(new Date(link.createdAt))}
        </div>
      </div>

      {/* Link + actions */}
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={link.shareUrl}
          className="flex-1 bg-[#080c14] border border-[#1e2d45] rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-400 outline-none truncate"
        />
        <button
          onClick={onCopy}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-[#1a2235] hover:bg-[#223050] text-xs text-zinc-300 transition-colors font-medium"
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
        <button
          onClick={onRevoke}
          className="shrink-0 px-3 py-1.5 rounded-lg hover:bg-red-950/50 text-xs text-zinc-600 hover:text-red-400 transition-colors"
        >
          Revoke
        </button>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-4 text-xs text-zinc-600 font-mono">
        {expires ? (
          <span className={expires < new Date() ? "text-red-500" : ""}>
            {expires < new Date() ? "⏰ Expired" : `Expires ${expires.toLocaleDateString()}`}
          </span>
        ) : (
          <span>Never expires</span>
        )}
        {link.maxUses !== null ? (
          <span className={link.useCount >= link.maxUses ? "text-amber-500" : ""}>
            {link.useCount} / {link.maxUses} uses
          </span>
        ) : (
          <span>{link.useCount} uses</span>
        )}
      </div>
    </div>
  );
}

function SkeletonLinks() {
  return (
    <div className="space-y-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-xl border border-[#1e2d45] p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="skeleton w-8 h-8 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton h-3.5 rounded w-40" />
              <div className="skeleton h-2.5 rounded w-20" />
            </div>
          </div>
          <div className="skeleton h-8 rounded-lg w-full" />
        </div>
      ))}
    </div>
  );
}