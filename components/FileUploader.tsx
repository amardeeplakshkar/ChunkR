// components/FileUploader.tsx
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useUpload } from "@/hooks/useUpload";

interface Props {
  folderId?: string;
  onUploadComplete?: () => void;
}

export function FileUploader({ folderId, onUploadComplete }: Props) {
  const { queue, addFiles, clearCompleted, isUploading, successCount } = useUpload(folderId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const arr = Array.from(files);
      if (!arr.length) return;
      addFiles(arr);
    },
    [addFiles]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  // Notify parent when all uploads finish — must be in useEffect, not render body
  const allDone = queue.length > 0 && !isUploading &&
    queue.every((i) => i.status === "success" || i.status === "error");

  useEffect(() => {
    if (allDone && successCount > 0) {
      onUploadComplete?.();
    }
  }, [allDone, successCount, onUploadComplete]);

  return (
    <div className="w-full space-y-4">
      {/* Drop Zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center gap-3
          border-2 border-dashed rounded-xl p-10 cursor-pointer
          transition-all duration-200 select-none
          ${isDragging
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 scale-[1.01]"
            : "border-zinc-300 dark:border-zinc-700 hover:border-blue-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <div className="text-4xl">{isDragging ? "📂" : "☁️"}</div>
        <div className="text-center">
          <p className="font-semibold text-zinc-800 dark:text-zinc-200">
            {isDragging ? "Drop files here" : "Upload files"}
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Drag & drop or click to browse · Any file type · Up to 2GB
          </p>
        </div>
      </div>

      {/* Upload Queue */}
      {queue.length > 0 && (
        <div className="space-y-2">
          {queue.map((item, i) => (
            <UploadRow key={i} item={item} />
          ))}
          {!isUploading && (
            <button
              onClick={clearCompleted}
              className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
            >
              Clear completed
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function UploadRow({ item }: { item: ReturnType<typeof useUpload>["queue"][number] }) {
  const { file, progress, status, error } = item;

  const statusColor = {
    idle: "bg-zinc-200 dark:bg-zinc-700",
    uploading: "bg-blue-500",
    success: "bg-emerald-500",
    error: "bg-red-500",
  }[status];

  const icon = {
    idle: "⏳",
    uploading: "⬆️",
    success: "✅",
    error: "❌",
  }[status];

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
      <span className="text-lg shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
          {file.name}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {formatBytes(file.size)}
          {error && <span className="text-red-500 ml-2">{error}</span>}
        </p>
        {status === "uploading" && (
          <div className="mt-1.5 h-1 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
      {status === "uploading" && (
        <span className="text-xs font-mono text-blue-500 shrink-0">{progress}%</span>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}