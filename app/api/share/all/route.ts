// app/api/share/all/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const links = await prisma.shareLink.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      file: {
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          size: true,
          deletedAt: true,
        },
      },
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  return NextResponse.json({
    links: links
      .filter((l) => !l.file.deletedAt)
      .map((l) => ({ ...l, shareUrl: `${appUrl}/s/${l.token}` })),
  });
}