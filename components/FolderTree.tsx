// components/FolderTree.tsx
"use client";
import { useEffect, useState, useCallback } from "react";

interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  _count: { files: number; children: number };
  children?: FolderNode[];
}

interface Props {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function FolderTree({ selectedId, onSelect }: Props) {
  const [roots, setRoots] = useState<FolderNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [children, setChildren] = useState<Record<string, FolderNode[]>>({});
  const [creating, setCreating] = useState<string | null>(null); // parentId being created under
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchFolders = useCallback(async (parentId: string | null) => {
    const url = parentId
      ? `/api/folders?parentId=${parentId}`
      : `/api/folders`;
    const res = await fetch(url);
    const data = await res.json();
    return data.folders as FolderNode[];
  }, []);

  useEffect(() => {
    fetchFolders(null).then((f) => {
      setRoots(f);
      setLoading(false);
    });
  }, [fetchFolders]);

  const toggleExpand = async (folder: FolderNode) => {
    const isOpen = expanded.has(folder.id);
    if (isOpen) {
      setExpanded((prev) => { const n = new Set(prev); n.delete(folder.id); return n; });
    } else {
      setExpanded((prev) => new Set(prev).add(folder.id));
      if (!children[folder.id]) {
        const sub = await fetchFolders(folder.id);
        setChildren((prev) => ({ ...prev, [folder.id]: sub }));
      }
    }
  };

  const createFolder = async (parentId: string | null) => {
    if (!newName.trim()) return;
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), parentId }),
    });
    const data = await res.json();
    const folder = data.folder as FolderNode;
    folder._count = { files: 0, children: 0 };

    if (!parentId) {
      setRoots((prev) => [...prev, folder]);
    } else {
      setChildren((prev) => ({
        ...prev,
        [parentId]: [...(prev[parentId] ?? []), folder],
      }));
      // Update parent's child count
      setRoots((prev) =>
        prev.map((f) =>
          f.id === parentId
            ? { ...f, _count: { ...f._count, children: f._count.children + 1 } }
            : f
        )
      );
    }
    setCreating(null);
    setNewName("");
  };

  const deleteFolder = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this folder and all its contents?")) return;
    await fetch("/api/folders", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setRoots((prev) => prev.filter((f) => f.id !== id));
    setChildren((prev) => {
      const n = { ...prev };
      delete n[id];
      return n;
    });
    if (selectedId === id) onSelect(null);
  };

  if (loading) {
    return <div className="text-xs text-zinc-500 px-3 py-2 animate-pulse">Loading folders…</div>;
  }

  return (
    <div className="text-sm select-none">
      {/* Root — All Files */}
      <FolderRow
        label="All Files"
        icon="🗂️"
        selected={selectedId === null}
        onClick={() => onSelect(null)}
        depth={0}
        onAdd={() => { setCreating("__root__"); setNewName(""); }}
      />

      {/* Root folders */}
      {roots.map((folder) => (
        <FolderSubTree
          key={folder.id}
          folder={folder}
          depth={1}
          selectedId={selectedId}
          expanded={expanded}
          children={children}
          onSelect={onSelect}
          onToggle={toggleExpand}
          onDelete={deleteFolder}
          onAdd={(id : string) => { setCreating(id); setNewName(""); }}
          creating={creating}
          newName={newName}
          setNewName={setNewName}
          onCreate={createFolder}
          onCancelCreate={() => setCreating(null)}
        />
      ))}

      {/* New root folder input */}
      {creating === "__root__" && (
        <NewFolderInput
          depth={1}
          value={newName}
          onChange={setNewName}
          onConfirm={() => createFolder(null)}
          onCancel={() => setCreating(null)}
        />
      )}

      {creating !== "__root__" && (
        <button
          onClick={() => { setCreating("__root__"); setNewName(""); }}
          className="flex items-center gap-1.5 w-full px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <span>＋</span> New folder
        </button>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function FolderSubTree({
  folder, depth, selectedId, expanded, children, onSelect,
  onToggle, onDelete, onAdd, creating, newName, setNewName, onCreate, onCancelCreate,
}: any) {
  const isOpen = expanded.has(folder.id);
  const hasChildren = folder._count.children > 0 || (children[folder.id]?.length ?? 0) > 0;

  return (
    <>
      <FolderRow
        label={folder.name}
        icon={isOpen ? "📂" : "📁"}
        selected={selectedId === folder.id}
        depth={depth}
        hasChildren={hasChildren}
        isOpen={isOpen}
        onClick={() => onSelect(folder.id)}
        onToggle={() => onToggle(folder)}
        onAdd={() => onAdd(folder.id)}
        onDelete={(e: React.MouseEvent) => onDelete(folder.id, e)}
        count={folder._count.files}
      />

      {isOpen && (
        <>
          {(children[folder.id] ?? []).map((child: FolderNode) => (
            <FolderSubTree
              key={child.id}
              folder={child}
              depth={depth + 1}
              selectedId={selectedId}
              expanded={expanded}
              children={children}
              onSelect={onSelect}
              onToggle={onToggle}
              onDelete={onDelete}
              onAdd={onAdd}
              creating={creating}
              newName={newName}
              setNewName={setNewName}
              onCreate={onCreate}
              onCancelCreate={onCancelCreate}
            />
          ))}

          {creating === folder.id && (
            <NewFolderInput
              depth={depth + 1}
              value={newName}
              onChange={setNewName}
              onConfirm={() => onCreate(folder.id)}
              onCancel={onCancelCreate}
            />
          )}
        </>
      )}
    </>
  );
}

function FolderRow({
  label, icon, selected, depth, hasChildren, isOpen,
  onClick, onToggle, onAdd, onDelete, count,
}: any) {
  return (
    <div
      className={`group flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer transition-colors
        ${selected
          ? "bg-blue-600/20 text-blue-400"
          : "hover:bg-zinc-800 text-zinc-300"
        }`}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
      onClick={onClick}
    >
      {/* Expand toggle */}
      {hasChildren !== undefined && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
          className="w-4 h-4 flex items-center justify-center shrink-0 text-zinc-500 hover:text-zinc-300"
        >
          {hasChildren ? (isOpen ? "▾" : "▸") : ""}
        </button>
      )}
      {hasChildren === undefined && <span className="w-4 shrink-0" />}

      <span className="text-base leading-none shrink-0">{icon}</span>
      <span className="flex-1 truncate text-sm">{label}</span>

      {count !== undefined && count > 0 && (
        <span className="text-xs text-zinc-600 group-hover:text-zinc-500 shrink-0">{count}</span>
      )}

      {/* Actions — visible on hover */}
      {(onAdd || onDelete) && (
        <span className="hidden group-hover:flex items-center gap-0.5 shrink-0">
          {onAdd && (
            <button
              onClick={(e) => { e.stopPropagation(); onAdd(); }}
              className="p-0.5 hover:text-zinc-100 text-zinc-500 text-xs"
              title="New subfolder"
            >＋</button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-0.5 hover:text-red-400 text-zinc-500 text-xs"
              title="Delete folder"
            >✕</button>
          )}
        </span>
      )}
    </div>
  );
}

function NewFolderInput({ depth, value, onChange, onConfirm, onCancel }: any) {
  return (
    <div
      className="flex items-center gap-1 px-2 py-1"
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      <span className="text-base">📁</span>
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onConfirm();
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Folder name…"
        className="flex-1 bg-zinc-800 border border-zinc-600 rounded px-2 py-0.5 text-sm text-zinc-100 outline-none focus:border-blue-500"
      />
      <button onClick={onConfirm} className="text-xs text-blue-400 hover:text-blue-300">✓</button>
      <button onClick={onCancel} className="text-xs text-zinc-500 hover:text-zinc-300">✕</button>
    </div>
  );
}