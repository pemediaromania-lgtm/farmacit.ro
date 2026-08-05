import { NextRequest, NextResponse } from "next/server";
import { generateDailyArticle } from "@/lib/ai/generateArticleForProduct";

// Endpoint apelat o dată pe zi de Railway Cron Job. Protejat prin header
// Authorization: Bearer <CRON_SECRET> — vezi README.md, secțiunea Deploy.
// Separat de /api/cron/sync-feeds (feed-urile se sincronizează la fiecare 2 zile,
// articolele se generează zilnic — cadențe diferite, deci cron-uri diferite).
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  }

  const result = await generateDailyArticle(null);
  return NextResponse.json(result);
}
