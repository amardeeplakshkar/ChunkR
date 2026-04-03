// app/(dashboard)/dashboard/page.tsx
"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { FileUploader } from "@/components/FileUploader";
import { FilePreviewModal } from "@/components/FilePreviewModal";
import { ShareLinkModal } from "@/components/ShareLinkModal";
import { formatBytes, fileIcon, isPreviewable, timeAgo } from "@/lib/utils";

interface FileItem {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  folderId: string | null;
  isMultipart: boolean;
  createdAt: string;
}

type SortKey = "name" | "size" | "createdAt";
type ViewMode = "list" | "grid";

export default function DashboardPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortAsc, setSortAsc] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [shareFile, setShareFile] = useState<FileItem | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [usedBytes, setUsedBytes] = useState(0);
  const [deleting, setDeleting] = useState(false);

  // ── Keep a ref in sync with state so action callbacks always read fresh data ──
  const filesRef = useRef<FileItem[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const searchRef = useRef(search);
  const pageRef = useRef(page);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchFiles = useCallback(async (q?: string, p?: number) => {
    // Always read from refs so this function never has stale params
    const query = q ?? searchRef.current;
    const pageNum = p ?? pageRef.current;

    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(pageNum), limit: "30" });
      if (query) qs.set("search", query);
      const res = await fetch(`/api/files?${qs}`);
      const data = await res.json();
      const fetched: FileItem[] = data.files ?? [];
      filesRef.current = fetched;        // keep ref fresh
      setFiles(fetched);
      setTotalPages(data.pagination?.totalPages ?? 1);
      setUsedBytes(Number(data.usedBytes ?? 0));
    } finally {
      setLoading(false);
    }
  }, []); // no deps — reads from refs

  useEffect(() => {
    pageRef.current = page;
    fetchFiles(undefined, page);
  }, [page, fetchFiles]);

  useEffect(() => {
    searchRef.current = search;
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      pageRef.current = 1;
      setPage(1);
      fetchFiles(search, 1);
    }, 300);
  }, [search, fetchFiles]);

  // ── File action handlers — look up file by ID from ref, never from closure ──
  const handlePreview = useCallback((id: string) => {
    const file = filesRef.current.find((f) => f.id === id) ?? null;
    setPreviewFile(file);
  }, []);

  const handleShare = useCallback((id: string) => {
    const file = filesRef.current.find((f) => f.id === id) ?? null;
    setShareFile(file);
  }, []);

  const handleDownload = useCallback((id: string) => {
    const file = filesRef.current.find((f) => f.id === id);
    if (!file) return;
    const a = document.createElement("a");
    a.href = `/api/files/${id}/download`;
    a.download = file.originalName;
    a.click();
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this file?")) return;
    await fetch("/api/files", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    fetchFiles();
  }, [fetchFiles]);

  // ── Sort ───────────────────────────────────────────────────────────────────
  const sortedFiles = [...files].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "name") cmp = a.originalName.localeCompare(b.originalName);
    else if (sortKey === "size") cmp = a.size - b.size;
    else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return sortAsc ? cmp : -cmp;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(false); }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const selectAll = () => {
    if (selected.size === files.length) setSelected(new Set());
    else setSelected(new Set(files.map((f) => f.id)));
  };

  const deleteSelected = async () => {
    if (!selected.size) return;
    if (!confirm(`Delete ${selected.size} file(s)? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch("/api/files", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected] }),
    });
    setSelected(new Set());
    await fetchFiles();
    setDeleting(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Files</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">
            {formatBytes(usedBytes)} used
          </p>
        </div>
        <button
          onClick={() => setShowUploader((v) => !v)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-sm transition-all hover:scale-[1.02] glow-blue"
        >
          <span>⬆️</span> Upload files
        </button>
      </div>

      {/* Uploader panel */}
      {showUploader && (
        <div className="rounded-xl border border-[#1e2d45] bg-[#0d1220] p-4 animate-fade-up">
          <FileUploader
            onUploadComplete={() => {
              fetchFiles();
              setShowUploader(false);
            }}
          />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search files…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0d1220] border border-[#1e2d45] focus:border-blue-500/60 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 border border-[#1e2d45] rounded-xl p-1">
          {(["name", "size", "createdAt"] as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => toggleSort(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize
                ${sortKey === key ? "bg-[#1a2235] text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              {key === "createdAt" ? "Date" : key}
              {sortKey === key && (sortAsc ? " ↑" : " ↓")}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 border border-[#1e2d45] rounded-xl p-1">
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded-lg text-sm transition-colors ${viewMode === "list" ? "bg-[#1a2235] text-zinc-100" : "text-zinc-500"}`}
            title="List view"
          >≡</button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-lg text-sm transition-colors ${viewMode === "grid" ? "bg-[#1a2235] text-zinc-100" : "text-zinc-500"}`}
            title="Grid view"
          >⊞</button>
        </div>
      </div>

      {/* Selection toolbar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-600/10 border border-blue-500/20 animate-fade-up">
          <span className="text-sm text-blue-400 font-medium">{selected.size} selected</span>
          <div className="flex-1" />
          <button
            onClick={deleteSelected}
            disabled={deleting}
            className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "🗑️ Delete"}
          </button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            Clear
          </button>
        </div>
      )}

      {/* File list */}
      {loading ? (
        <SkeletonList />
      ) : sortedFiles.length === 0 ? (
        <EmptyState search={search} onUpload={() => setShowUploader(true)} />
      ) : viewMode === "list" ? (
        <div className="rounded-xl border border-[#1e2d45] overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center px-4 py-2.5 border-b border-[#1e2d45] bg-[#0d1220]">
            <input type="checkbox" checked={selected.size === files.length && files.length > 0} onChange={selectAll} className="accent-blue-500" />
            <button onClick={() => toggleSort("name")} className="text-xs font-mono text-zinc-500 hover:text-zinc-300 text-left transition-colors">
              NAME {sortKey === "name" && (sortAsc ? "↑" : "↓")}
            </button>
            <button onClick={() => toggleSort("size")} className="text-xs font-mono text-zinc-500 hover:text-zinc-300 text-right transition-colors hidden sm:block">
              SIZE {sortKey === "size" && (sortAsc ? "↑" : "↓")}
            </button>
            <button onClick={() => toggleSort("createdAt")} className="text-xs font-mono text-zinc-500 hover:text-zinc-300 text-right transition-colors hidden md:block">
              UPLOADED {sortKey === "createdAt" && (sortAsc ? "↑" : "↓")}
            </button>
            <span className="text-xs font-mono text-zinc-700">ACTIONS</span>
          </div>

          <div className="divide-y divide-[#1e2d45]/50">
            {sortedFiles.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                selected={selected.has(file.id)}
                onSelect={() => toggleSelect(file.id)}
                onPreview={() => handlePreview(file.id)}
                onShare={() => handleShare(file.id)}
                onDownload={() => handleDownload(file.id)}
                onDelete={() => handleDelete(file.id)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 stagger">
          {sortedFiles.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              selected={selected.has(file.id)}
              onSelect={() => toggleSelect(file.id)}
              onPreview={() => handlePreview(file.id)}
              onShare={() => handleShare(file.id)}
              onDownload={() => handleDownload(file.id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg border border-[#1e2d45] text-sm text-zinc-400 hover:text-zinc-100 disabled:opacity-30 transition-colors"
          >← Prev</button>
          <span className="text-sm font-mono text-zinc-500">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg border border-[#1e2d45] text-sm text-zinc-400 hover:text-zinc-100 disabled:opacity-30 transition-colors"
          >Next →</button>
        </div>
      )}

      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      <ShareLinkModal file={shareFile} onClose={() => setShareFile(null)} />
    </div>
  );
}

// ─── FileRow ───────────────────────────────────────────────────────────────

function FileRow({ file, selected, onSelect, onPreview, onShare, onDownload, onDelete }: {
  file: FileItem; selected: boolean;
  onSelect: () => void; onPreview: () => void;
  onShare: () => void; onDownload: () => void; onDelete: () => void;
}) {
  const canPreview = isPreviewable(file.mimeType);
  return (
    <div className={`file-row grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center px-4 py-3 group ${selected ? "bg-blue-600/5" : ""}`}>
      <input type="checkbox" checked={selected} onChange={onSelect} className="accent-blue-500" onClick={(e) => e.stopPropagation()} />
      <button className="flex items-center gap-3 min-w-0 text-left" onClick={canPreview ? onPreview : onDownload}>
        <span className="text-xl shrink-0">{fileIcon(file.mimeType)}</span>
        <div className="min-w-0">
          <p className="text-sm text-zinc-200 truncate font-medium">{file.originalName}</p>
          <p className="text-xs text-zinc-600 font-mono">{file.mimeType}{file.isMultipart && " · multipart"}</p>
        </div>
      </button>
      <span className="text-xs font-mono text-zinc-500 text-right hidden sm:block">{formatBytes(file.size)}</span>
      <span className="text-xs font-mono text-zinc-600 text-right hidden md:block whitespace-nowrap">{timeAgo(new Date(file.createdAt))}</span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {canPreview && <ActionBtn onClick={(e) => { e.stopPropagation(); onPreview(); }} title="Preview" icon="👁️" />}
        <ActionBtn onClick={(e) => { e.stopPropagation(); onDownload(); }} title="Download" icon="⬇️" />
        <ActionBtn onClick={(e) => { e.stopPropagation(); onShare(); }} title="Share" icon="🔗" />
        <ActionBtn onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete" icon="🗑️" danger />
      </div>
    </div>
  );
}

// ─── FileCard ──────────────────────────────────────────────────────────────

function FileCard({ file, selected, onSelect, onPreview, onShare, onDownload }: {
  file: FileItem; selected: boolean;
  onSelect: () => void; onPreview: () => void;
  onShare: () => void; onDownload: () => void;
}) {
  const canPreview = isPreviewable(file.mimeType);
  return (
    <div
      className={`animate-fade-up opacity-0 group relative rounded-xl border transition-all cursor-pointer
        ${selected ? "border-blue-500/50 bg-blue-600/10" : "border-[#1e2d45] hover:border-[#2a3f5f] bg-[#0d1220] hover:bg-[#111827]"}`}
      onClick={canPreview ? onPreview : onDownload}
    >
      <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        <input type="checkbox" checked={selected} onChange={onSelect} className="accent-blue-500" />
      </div>
      <div className="flex items-center justify-center h-24 text-4xl border-b border-[#1e2d45]/50">{fileIcon(file.mimeType)}</div>
      <div className="p-3 space-y-1">
        <p className="text-xs font-medium text-zinc-200 truncate">{file.originalName}</p>
        <p className="text-xs font-mono text-zinc-600">{formatBytes(file.size)}</p>
      </div>
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <ActionBtn onClick={(e) => { e.stopPropagation(); onShare(); }} title="Share" icon="🔗" small />
        <ActionBtn onClick={(e) => { e.stopPropagation(); onDownload(); }} title="Download" icon="⬇️" small />
      </div>
    </div>
  );
}

// ─── ActionBtn ─────────────────────────────────────────────────────────────

function ActionBtn({ onClick, title, icon, danger, small }: {
  onClick: (e: React.MouseEvent) => void;
  title: string; icon: string; danger?: boolean; small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`rounded-lg transition-colors ${small ? "p-1 text-xs" : "p-1.5 text-sm"}
        ${danger ? "hover:bg-red-950/60 hover:text-red-400 text-zinc-600" : "hover:bg-[#1a2235] text-zinc-500 hover:text-zinc-200"}`}
    >
      {icon}
    </button>
  );
}

// ─── Empty / Skeleton ──────────────────────────────────────────────────────

function EmptyState({ search, onUpload }: { search: string; onUpload: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
      <div className="text-5xl opacity-30">{search ? "🔍" : "📭"}</div>
      <p className="text-zinc-400 font-medium">{search ? `No files matching "${search}"` : "No files yet"}</p>
      {!search && (
        <button onClick={onUpload} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold transition-colors">
          Upload your first file
        </button>
      )}
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="rounded-xl border border-[#1e2d45] overflow-hidden divide-y divide-[#1e2d45]/50">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <div className="skeleton w-4 h-4 rounded" />
          <div className="skeleton w-8 h-8 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <div className="skeleton h-3.5 rounded w-48" />
            <div className="skeleton h-2.5 rounded w-24" />
          </div>
          <div className="skeleton h-3 rounded w-12 hidden sm:block" />
          <div className="skeleton h-3 rounded w-16 hidden md:block" />
        </div>
      ))}
    </div>
  );
}