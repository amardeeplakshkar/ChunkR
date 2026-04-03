
// components/StorageDashboard.tsx
"use client";
import { useEffect, useState } from "react";

interface UsageData {
  usedBytes: number;
  fileCount: number;
  byType: { mimeGroup: string; count: number; totalSize: number }[];
  recentFiles: { id: string; originalName: string; size: number; mimeType: string; createdAt: string }[];
}

// Telegram gives ~unlimited storage, but we show a soft "display" cap for the bar
const DISPLAY_CAP_GB = 50;
const DISPLAY_CAP = DISPLAY_CAP_GB * 1024 * 1024 * 1024;

export function StorageDashboard() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/storage/usage")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-zinc-800" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const usedPct = Math.min((data.usedBytes / DISPLAY_CAP) * 100, 100);

  return (
    <div className="space-y-6">
      {/* Top stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Storage Used"
          value={formatBytes(data.usedBytes)}
          sub={`of ${DISPLAY_CAP_GB} GB display cap`}
          icon="💾"
          accent="blue"
        />
        <StatCard
          label="Total Files"
          value={String(data.fileCount)}
          sub="across all folders"
          icon="📁"
          accent="violet"
        />
        <StatCard
          label="Largest Type"
          value={data.byType[0]?.mimeGroup ?? "—"}
          sub={data.byType[0] ? `${data.byType[0].count} files` : "no files yet"}
          icon="📊"
          accent="emerald"
        />
      </div>

      {/* Storage bar */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-300 font-medium">Storage</span>
          <span className="text-zinc-500 font-mono text-xs">
            {formatBytes(data.usedBytes)} used
          </span>
        </div>
        <div className="h-2.5 w-full bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-700"
            style={{ width: `${usedPct}%` }}
          />
        </div>
        <p className="text-xs text-zinc-600">
          Telegram provides unlimited free storage. This bar is for display purposes only.
        </p>
      </div>

      {/* File type breakdown */}
      {data.byType.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
          <h3 className="text-sm font-medium text-zinc-300">By File Type</h3>
          <div className="space-y-3">
            {data.byType.map((group) => {
              const pct = data.usedBytes > 0
                ? Math.round((group.totalSize / data.usedBytes) * 100)
                : 0;
              return (
                <div key={group.mimeGroup} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <span>{mimeGroupIcon(group.mimeGroup)}</span>
                      <span className="capitalize">{group.mimeGroup}</span>
                      <span className="text-zinc-600">({group.count})</span>
                    </span>
                    <span className="text-zinc-500 font-mono">
                      {formatBytes(group.totalSize)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: mimeGroupColor(group.mimeGroup),
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent uploads */}
      {data.recentFiles.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
          <h3 className="text-sm font-medium text-zinc-300">Recent Uploads</h3>
          <div className="space-y-2">
            {data.recentFiles.map((f) => (
              <div key={f.id} className="flex items-center gap-3 text-sm">
                <span className="text-lg shrink-0">{mimeGroupIcon(mimeToGroup(f.mimeType))}</span>
                <span className="flex-1 truncate text-zinc-300">{f.originalName}</span>
                <span className="text-xs text-zinc-600 shrink-0">{formatBytes(f.size)}</span>
                <span className="text-xs text-zinc-700 shrink-0">
                  {timeAgo(new Date(f.createdAt))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, accent }: {
  label: string; value: string; sub: string; icon: string;
  accent: "blue" | "violet" | "emerald";
}) {
  const colors = {
    blue: "border-blue-800/40 bg-blue-950/20",
    violet: "border-violet-800/40 bg-violet-950/20",
    emerald: "border-emerald-800/40 bg-emerald-950/20",
  };
  return (
    <div className={`rounded-xl border p-4 space-y-1 ${colors[accent]}`}>
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <span className="text-xs text-zinc-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-zinc-100">{value}</p>
      <p className="text-xs text-zinc-600">{sub}</p>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function mimeToGroup(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "images";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("text/")) return "text";
  if (mimeType.includes("zip") || mimeType.includes("tar") || mimeType.includes("rar")) return "archives";
  return "other";
}

function mimeGroupIcon(group: string): string {
  const map: Record<string, string> = {
    images: "🖼️", video: "🎬", audio: "🎵", pdf: "📄",
    text: "📝", archives: "🗜️", other: "📦",
  };
  return map[group] ?? "📦";
}

function mimeGroupColor(group: string): string {
  const map: Record<string, string> = {
    images: "#3b82f6", video: "#8b5cf6", audio: "#10b981",
    pdf: "#ef4444", text: "#f59e0b", archives: "#6b7280", other: "#64748b",
  };
  return map[group] ?? "#64748b";
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}