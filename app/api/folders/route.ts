// app/api/folders/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// ─── GET /api/folders ──────────────────────────────────────────────────────
// List folders. Optionally filter by parentId.

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const parentId = searchParams.get("parentId") || null;

  const folders = await prisma.folder.findMany({
    where: { userId, parentId },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { files: true, children: true } },
    },
  });

  return NextResponse.json({ folders });
}

// ─── POST /api/folders ─────────────────────────────────────────────────────
// Create a folder.
// Body: { name: string, parentId?: string }

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const name = body.name?.trim();
  const parentId = body.parentId ?? null;

  if (!name) {
    return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
  }

  // Verify parent belongs to user
  if (parentId) {
    const parent = await prisma.folder.findFirst({ where: { id: parentId, userId } });
    if (!parent) {
      return NextResponse.json({ error: "Parent folder not found" }, { status: 404 });
    }
  }

  const folder = await prisma.folder.create({
    data: { name, userId, parentId },
  });

  return NextResponse.json({ folder }, { status: 201 });
}

// ─── DELETE /api/folders ───────────────────────────────────────────────────
// Delete a folder (and its contents recursively via cascade or manual deletion)
// Body: { id: string }

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id } = body;

  if (!id) return NextResponse.json({ error: "Folder ID required" }, { status: 400 });

  const folder = await prisma.folder.findFirst({ where: { id, userId } });
  if (!folder) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Soft-delete all files in folder (you should also delete from Telegram in production)
  await prisma.file.updateMany({
    where: { folderId: id, userId },
    data: { deletedAt: new Date() },
  });

  await prisma.folder.delete({ where: { id } });

  return NextResponse.json({ deleted: id });
}