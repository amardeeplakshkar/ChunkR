// components/FilePreviewModal.tsx
"use client";
import { useEffect, useState } from "react";

interface FileInfo {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
}

interface Props {
  file: FileInfo | null;
  onClose: () => void;
}

export function FilePreviewModal({ file, onClose }: Props) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;
    if (!isPreviewable(file.mimeType)) return;

    let revoke: string | null = null;
    setLoading(true);
    setError(null);

    fetch(`/api/files/${file.id}/download`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load preview");
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        revoke = url;
        setObjectUrl(url);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
      setObjectUrl(null);
    };
  }, [file]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!file) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-700 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
          <div className="min-w-0">
            <p className="font-medium text-zinc-100 truncate">{file.originalName}</p>
            <p className="text-xs text-zinc-500">{formatBytes(file.size)} · {file.mimeType}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <a
              href={`/api/files/${file.id}/download`}
              download={file.originalName}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm text-white font-medium transition-colors"
            >
              ⬇️ Download
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors text-lg leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-zinc-950 min-h-0">
          {loading && (
            <div className="text-zinc-500 text-sm animate-pulse">Loading preview…</div>
          )}
          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}
          {!loading && !error && objectUrl && (
            <PreviewContent mimeType={file.mimeType} url={objectUrl} name={file.originalName} />
          )}
          {!loading && !error && !objectUrl && !isPreviewable(file.mimeType) && (
            <div className="text-center text-zinc-500 space-y-3 p-10">
              <div className="text-5xl">{fileIcon(file.mimeType)}</div>
              <p className="text-sm">No preview available for this file type.</p>
              <a
                href={`/api/files/${file.id}/download`}
                download={file.originalName}
                className="inline-block px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm text-white transition-colors"
              >
                Download to view
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewContent({ mimeType, url, name }: { mimeType: string; url: string; name: string }) {
  if (mimeType.startsWith("image/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={name} className="max-w-full max-h-full object-contain p-2" />
    );
  }
  if (mimeType === "application/pdf") {
    return <iframe src={url} title={name} className="w-full h-full min-h-[70vh]" />;
  }
  if (mimeType.startsWith("video/")) {
    return (
      <video controls autoPlay className="max-w-full max-h-full">
        <source src={url} type={mimeType} />
      </video>
    );
  }
  if (mimeType.startsWith("audio/")) {
    return (
      <div className="p-10 w-full">
        <audio controls autoPlay className="w-full">
          <source src={url} type={mimeType} />
        </audio>
      </div>
    );
  }
  if (mimeType.startsWith("text/")) {
    return <TextPreview url={url} />;
  }
  return null;
}

function TextPreview({ url }: { url: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    fetch(url).then((r) => r.text()).then(setText);
  }, [url]);
  return (
    <pre className="text-xs text-zinc-300 p-6 overflow-auto w-full h-full font-mono whitespace-pre-wrap">
      {text ?? "Loading…"}
    </pre>
  );
}

function isPreviewable(mimeType: string): boolean {
  return (
    mimeType.startsWith("image/") ||
    mimeType.startsWith("video/") ||
    mimeType.startsWith("audio/") ||
    mimeType.startsWith("text/") ||
    mimeType === "application/pdf"
  );
}

function fileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.startsWith("video/")) return "🎬";
  if (mimeType.startsWith("audio/")) return "🎵";
  if (mimeType.includes("zip") || mimeType.includes("tar")) return "🗜️";
  if (mimeType.includes("pdf")) return "📄";
  return "📦";
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}