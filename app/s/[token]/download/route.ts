// app/s/[token]/route.ts
// Public share link handler — no auth required
// Validates token, checks expiry/use-count, then streams the file

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTelegramFileUrl, downloadMultipart } from "@/lib/telegram";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const link = await prisma.shareLink.findUnique({
    where: { token },
    include: {
      file: {
        include: { parts: { orderBy: { partNumber: "asc" } } },
      },
    },
  });

  // Not found
  if (!link) {
    return new NextResponse("Link not found or revoked.", { status: 404 });
  }

  // Expired
  if (link.expiresAt && link.expiresAt < new Date()) {
    return new NextResponse("This link has expired.", { status: 410 });
  }

  // Max uses exceeded
  if (link.maxUses !== null && link.useCount >= link.maxUses) {
    return new NextResponse("This link has reached its maximum number of uses.", {
      status: 410,
    });
  }

  // File deleted
  if (link.file.deletedAt) {
    return new NextResponse("File no longer exists.", { status: 404 });
  }

  // Increment use count
  await prisma.shareLink.update({
    where: { id: link.id },
    data: { useCount: { increment: 1 } },
  });

  const file = link.file;
  const inline = isPreviewable(file.mimeType);
  const disposition = inline
    ? `inline; filename="${encodeURIComponent(file.originalName)}"`
    : `attachment; filename="${encodeURIComponent(file.originalName)}"`;

  // Single file — proxy from Telegram
  if (!file.isMultipart) {
    const url = await getTelegramFileUrl(file.telegramFileId);
    const tgRes = await fetch(url);
    if (!tgRes.ok) {
      return new NextResponse("Failed to fetch file.", { status: 502 });
    }
    return new NextResponse(tgRes.body, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": disposition,
        "Content-Length": String(file.size),
        "Cache-Control": "private, no-store",
      },
    });
  }

  // Multipart — reassemble
  const buffer = await downloadMultipart(
    file.parts.map((p) => ({
      telegramFileId: p.telegramFileId,
      partNumber: p.partNumber,
    }))
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": disposition,
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "private, no-store",
    },
  });
}

function isPreviewable(mimeType: string): boolean {
  return (
    mimeType.startsWith("image/") ||
    mimeType.startsWith("video/") ||
    mimeType.startsWith("audio/") ||
    mimeType === "application/pdf"
  );
}