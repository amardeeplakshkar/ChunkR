// app/api/files/[id]/share/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// ─── POST /api/files/:id/share ─────────────────────────────────────────────
// Create a shareable link for a file
// Body: { expiresIn?: "1h" | "24h" | "7d" | "30d" | "never", maxUses?: number }

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const file = await prisma.file.findFirst({
    where: { id, userId, deletedAt: null },
  });
  if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });

  const body = await req.json();
  const expiresIn: string = body.expiresIn ?? "7d";
  const maxUses: number | undefined = body.maxUses;

  const expiresAt = expiresIn === "never" ? null : calcExpiry(expiresIn);

  const link = await prisma.shareLink.create({
    data: {
      fileId: file.id,
      userId,
      expiresAt,
      maxUses: maxUses ?? null,
    },
  });

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/s/${link.token}`;

  return NextResponse.json({ link: { ...link, shareUrl } }, { status: 201 });
}

// ─── GET /api/files/:id/share ──────────────────────────────────────────────
// List all share links for a file

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const links = await prisma.shareLink.findMany({
    where: { fileId: id, userId },
    orderBy: { createdAt: "desc" },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  return NextResponse.json({
    links: links.map((l) => ({ ...l, shareUrl: `${appUrl}/s/${l.token}` })),
  });
}

// ─── DELETE /api/files/:id/share ───────────────────────────────────────────
// Revoke a share link
// Body: { token: string }

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await req.json();
  await prisma.shareLink.deleteMany({ where: { token, userId } });
  return NextResponse.json({ revoked: token });
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function calcExpiry(expiresIn: string): Date {
  const now = Date.now();
  const map: Record<string, number> = {
    "1h":  1 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d":  7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };
  return new Date(now + (map[expiresIn] ?? map["7d"]));
}