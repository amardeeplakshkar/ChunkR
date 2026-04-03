// app/api/files/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deleteFromTelegram, deleteMultipartFromTelegram } from "@/lib/telegram";

// ─── GET /api/files ────────────────────────────────────────────────────────
// List files for the authenticated user
// Query params: folderId, search, page, limit

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get("folderId") || null;
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const skip = (page - 1) * limit;

  const where = {
    userId,
    deletedAt: null,
    folderId: folderId,
    ...(search
      ? { originalName: { contains: search, mode: "insensitive" as const } }
      : {}),
  };

  const [files, total, usage] = await Promise.all([
    prisma.file.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        originalName: true,
        mimeType: true,
        size: true,
        folderId: true,
        isMultipart: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.file.count({ where }),
    prisma.storageUsage.findUnique({ where: { userId } }),
  ]);

  return NextResponse.json({
    files,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    usedBytes: usage?.usedBytes?.toString() ?? "0",
  });
}

// ─── DELETE /api/files ─────────────────────────────────────────────────────
// Delete files by IDs (batch delete)
// Body: { ids: string[] }

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const ids: string[] = body.ids ?? [];

  if (!ids.length) {
    return NextResponse.json({ error: "No file IDs provided" }, { status: 400 });
  }

  // Fetch files to get Telegram IDs + ownership check
  const files = await prisma.file.findMany({
    where: { id: { in: ids }, userId, deletedAt: null },
    include: { parts: true },
  });

  if (!files.length) {
    return NextResponse.json({ error: "No matching files found" }, { status: 404 });
  }

  // Delete from Telegram
  await Promise.allSettled(
    files.map(async (file) => {
      if (file.isMultipart && file.parts.length > 0) {
        await deleteMultipartFromTelegram(
          file.parts.map((p) => ({ telegramMsgId: p.telegramMsgId, chatId: p.chatId }))
        );
      } else {
        await deleteFromTelegram(file.telegramMsgId, file.chatId);
      }
    })
  );

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  // Soft delete in DB
  await prisma.file.updateMany({
    where: { id: { in: files.map((f) => f.id) } },
    data: { deletedAt: new Date() },
  });

  // Decrement storage usage
  await prisma.storageUsage.update({
    where: { userId },
    data: { usedBytes: { decrement: totalSize } },
  });

  return NextResponse.json({ deleted: files.map((f) => f.id) });
}