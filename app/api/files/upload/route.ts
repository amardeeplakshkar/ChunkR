// app/api/files/upload/route.ts
//
// Handles two modes, both sent as raw binary (Content-Type: application/octet-stream):
//
// Mode A — single file (< 8 MB after client-side check):
//   Headers: x-upload-mode=single, x-file-name, x-file-size, x-mime-type, x-folder-id?
//   Body: raw file bytes
//
// Mode B — one chunk of a large file:
//   Headers: x-upload-mode=chunk, x-file-id (existing DB id), x-chunk-index, x-total-chunks,
//            x-file-name (only on chunk 0), x-file-size (only on chunk 0),
//            x-mime-type (only on chunk 0), x-folder-id? (only on chunk 0)
//   Body: raw chunk bytes
//
// Sending raw binary instead of multipart FormData avoids the 10 MB Next.js limit
// because the overhead is zero and the body IS the file.

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { uploadToTelegram } from "@/lib/telegram";

export const maxDuration = 300; // 5 min for large chunks

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const mode       = req.headers.get("x-upload-mode") ?? "single";
    const chunkIndex = parseInt(req.headers.get("x-chunk-index") ?? "0");
    const totalChunks= parseInt(req.headers.get("x-total-chunks") ?? "1");
    const fileId     = req.headers.get("x-file-id") ?? undefined;
    const fileName   = req.headers.get("x-file-name") ?? "file";
    const fileSize   = parseInt(req.headers.get("x-file-size") ?? "0");
    const mimeType   = req.headers.get("x-mime-type") ?? "application/octet-stream";
    const folderId   = req.headers.get("x-folder-id") ?? null;

    // Read raw body
    const arrayBuf = await req.arrayBuffer();
    const buffer   = Buffer.from(arrayBuf);
    const decodedName = decodeURIComponent(fileName);

    if (mode === "single") {
      // ── Single small file ────────────────────────────────────────────────
      const result = await uploadToTelegram(buffer, decodedName, mimeType);

      const fileRecord = await prisma.file.create({
        data: {
          name:          slugify(decodedName),
          originalName:  decodedName,
          mimeType,
          size:          fileSize || buffer.byteLength,
          userId,
          folderId:      folderId || null,
          telegramFileId: result.telegramFileId,
          telegramMsgId:  result.telegramMsgId,
          chatId:         result.chatId,
          isMultipart:    false,
        },
      });

      await upsertUsage(userId, fileSize || buffer.byteLength);
      return NextResponse.json({ file: sanitize(fileRecord) }, { status: 201 });
    }

    // ── Chunked upload ───────────────────────────────────────────────────
    const partName = `${decodedName}.part${String(chunkIndex).padStart(4, "0")}`;
    const result   = await uploadToTelegram(buffer, partName, "application/octet-stream");

    if (chunkIndex === 0) {
      // First chunk — create the File record + first FilePart
      const fileRecord = await prisma.file.create({
        data: {
          name:          slugify(decodedName),
          originalName:  decodedName,
          mimeType,
          size:          fileSize,
          userId,
          folderId:      folderId || null,
          telegramFileId: result.telegramFileId,
          telegramMsgId:  result.telegramMsgId,
          chatId:         result.chatId,
          isMultipart:    totalChunks > 1,
          parts: {
            create: [{
              partNumber:    0,
              telegramFileId: result.telegramFileId,
              telegramMsgId:  result.telegramMsgId,
              chatId:         result.chatId,
              size:           buffer.byteLength,
            }],
          },
        },
      });

      // On last chunk (file fits in one chunk), update usage now
      if (totalChunks === 1) await upsertUsage(userId, fileSize);

      return NextResponse.json({
        fileId: fileRecord.id,
        chunkIndex,
        done: totalChunks === 1,
        file: totalChunks === 1 ? sanitize(fileRecord) : undefined,
      }, { status: 201 });
    }

    // Subsequent chunks — append FilePart to existing File
    if (!fileId) return NextResponse.json({ error: "x-file-id required for chunk > 0" }, { status: 400 });

    await prisma.filePart.create({
      data: {
        fileId,
        partNumber:    chunkIndex,
        telegramFileId: result.telegramFileId,
        telegramMsgId:  result.telegramMsgId,
        chatId:         result.chatId,
        size:           buffer.byteLength,
      },
    });

    const isLast = chunkIndex === totalChunks - 1;

    if (isLast) {
      // Mark upload complete
      const fileRecord = await prisma.file.findUnique({ where: { id: fileId } });
      await upsertUsage(userId, fileSize);
      return NextResponse.json({
        fileId,
        chunkIndex,
        done: true,
        file: fileRecord ? sanitize(fileRecord) : undefined,
      });
    }

    return NextResponse.json({ fileId, chunkIndex, done: false });

  } catch (err: any) {
    console.error("[upload]", err);
    return NextResponse.json({ error: err.message ?? "Upload failed" }, { status: 500 });
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function slugify(name: string) {
  return name.trim().replace(/\s+/g, "_");
}

function sanitize(file: any) {
  const { telegramFileId, telegramMsgId, chatId, parts, ...safe } = file;
  return safe;
}

async function upsertUsage(userId: string, bytes: number) {
  await prisma.storageUsage.upsert({
    where:  { userId },
    update: { usedBytes: { increment: bytes } },
    create: { userId, usedBytes: bytes },
  });
}