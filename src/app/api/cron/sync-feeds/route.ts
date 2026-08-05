import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { importFeed } from "@/lib/feed/importFeed";

// Endpoint apelat periodic de Railway Cron Job. Protejat prin header
// Authorization: Bearer <CRON_SECRET> — vezi README.md, secțiunea Deploy.
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  }

  const feeds = await prisma.feed.findMany({ select: { id: true, name: true } });
  const results: Record<string, unknown>[] = [];

  for (const feed of feeds) {
    try {
      const result = await importFeed(feed.id, null);
      results.push({ feedId: feed.id, name: feed.name, ...result });
    } catch (error) {
      results.push({ feedId: feed.id, name: feed.name, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return NextResponse.json({ syncedFeeds: feeds.length, results });
}
