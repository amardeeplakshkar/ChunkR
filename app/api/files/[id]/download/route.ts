// app/api/files/[id]/download/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  downloadFromTelegram,
  downloadMultipart,
  getTelegramFileUrl,
} from "@/lib/telegram";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const file = await prisma.file.findFirst({
    where: { id, userId, deletedAt: null },
    include: { parts: { orderBy: { partNumber: "asc" } } },
  });

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // For small files, redirect to a Telegram CDN URL directly (faster)
  if (!file.isMultipart) {
    try {
      const url = await getTelegramFileUrl(file.telegramFileId);
      // Stream the file through our server so we can set the correct filename
      const tgRes = await fetch(url);
      if (!tgRes.ok) throw new Error("Telegram fetch failed");

      return new NextResponse(tgRes.body, {
        headers: {
          "Content-Type": file.mimeType,
          "Content-Disposition": `attachment; filename="${encodeURIComponent(file.originalName)}"`,
          "Content-Length": String(file.size),
          "Cache-Control": "private, no-cache",
        },
      });
    } catch (err) {
      console.error("[download single]", err);
      return NextResponse.json({ error: "Download failed" }, { status: 500 });
    }
  }

  // For multipart files, reassemble and stream
  try {
    const buffer = await downloadMultipart(
      file.parts.map((p) => ({
        telegramFileId: p.telegramFileId,
        partNumber: p.partNumber,
      }))
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(file.originalName)}"`,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (err) {
    console.error("[download multipart]", err);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}