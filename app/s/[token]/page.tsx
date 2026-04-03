// app/s/[token]/page.tsx
// Public-facing share page with file preview

import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatBytes } from "@/lib/utils";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function SharePage({ params }: Props) {
  const { token } = await params;
  const link = await prisma.shareLink.findUnique({
    where: { token },
    include: { file: true },
  });

  if (!link || link.file.deletedAt) return notFound();

  const expired = link.expiresAt && link.expiresAt < new Date();
  const maxed = link.maxUses !== null && link.useCount >= link.maxUses;

  const downloadUrl = `/s/${token}/download`;
  const file = link.file;
  const previewable = isPreviewable(file.mimeType);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <p className="text-xs uppercase tracking-widest text-zinc-500 font-mono">
            Shared file
          </p>
          <h1 className="text-2xl font-bold truncate">{file.originalName}</h1>
          <p className="text-sm text-zinc-400">
            {formatBytes(file.size)} · {file.mimeType}
          </p>
        </div>

        {/* Expired / maxed banner */}
        {(expired || maxed) && (
          <div className="rounded-xl border border-red-800 bg-red-950/40 p-4 text-center text-sm text-red-400">
            {expired ? "⏰ This link has expired." : "🔒 This link has reached its maximum uses."}
          </div>
        )}

        {/* Preview */}
        {!expired && !maxed && previewable && (
          <div className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900">
            <FilePreview mimeType={file.mimeType} url={downloadUrl} name={file.originalName} />
          </div>
        )}

        {/* Download button */}
        {!expired && !maxed && (
          <a
            href={downloadUrl}
            download={file.originalName}
            className="flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 transition-colors font-semibold text-white"
          >
            ⬇️ Download
          </a>
        )}

        {/* Expiry info */}
        <div className="text-center text-xs text-zinc-600 space-y-1">
          {link.expiresAt && (
            <p>Expires {new Date(link.expiresAt).toLocaleString()}</p>
          )}
          {link.maxUses && (
            <p>{link.useCount} / {link.maxUses} uses</p>
          )}
        </div>
      </div>
    </main>
  );
}

function FilePreview({
  mimeType,
  url,
  name,
}: {
  mimeType: string;
  url: string;
  name: string;
}) {
  if (mimeType.startsWith("image/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={name} className="w-full max-h-[60vh] object-contain bg-zinc-900" />
    );
  }
  if (mimeType === "application/pdf") {
    return (
      <iframe src={url} title={name} className="w-full h-[60vh]" />
    );
  }
  if (mimeType.startsWith("video/")) {
    return (
      <video controls className="w-full max-h-[60vh]">
        <source src={url} type={mimeType} />
      </video>
    );
  }
  if (mimeType.startsWith("audio/")) {
    return (
      <div className="p-6">
        <audio controls className="w-full">
          <source src={url} type={mimeType} />
        </audio>
      </div>
    );
  }
  return null;
}

function isPreviewable(mimeType: string): boolean {
  return (
    mimeType.startsWith("image/") ||
    mimeType.startsWith("video/") ||
    mimeType.startsWith("audio/") ||
    mimeType === "application/pdf"
  );
}