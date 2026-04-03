// app/api/storage/usage/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [usage, fileCount, byTypeRaw, recentFiles] = await Promise.all([
    prisma.storageUsage.findUnique({ where: { userId } }),

    prisma.file.count({ where: { userId, deletedAt: null } }),

    // Group by mimeType prefix to get size per category
    prisma.$queryRaw<{ mimeGroup: string; count: bigint; totalSize: bigint }[]>`
      SELECT
        CASE
          WHEN "mimeType" LIKE 'image/%'       THEN 'images'
          WHEN "mimeType" LIKE 'video/%'       THEN 'video'
          WHEN "mimeType" LIKE 'audio/%'       THEN 'audio'
          WHEN "mimeType" = 'application/pdf'  THEN 'pdf'
          WHEN "mimeType" LIKE 'text/%'        THEN 'text'
          WHEN "mimeType" LIKE '%zip%'
            OR "mimeType" LIKE '%tar%'
            OR "mimeType" LIKE '%rar%'         THEN 'archives'
          ELSE 'other'
        END AS "mimeGroup",
        COUNT(*)::bigint AS count,
        SUM(size)::bigint AS "totalSize"
      FROM "File"
      WHERE "userId" = ${userId}
        AND "deletedAt" IS NULL
      GROUP BY "mimeGroup"
      ORDER BY "totalSize" DESC
    `,

    prisma.file.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        originalName: true,
        size: true,
        mimeType: true,
        createdAt: true,
      },
    }),
  ]);

  // Normalize BigInt from raw query
  const byType = byTypeRaw.map((row) => ({
    mimeGroup: row.mimeGroup,
    count: Number(row.count),
    totalSize: Number(row.totalSize),
  }));

  return NextResponse.json({
    usedBytes: Number(usage?.usedBytes ?? 0),
    fileCount,
    byType,
    recentFiles,
  });
}