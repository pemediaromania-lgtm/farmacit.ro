import { NextRequest, NextResponse } from "next/server";
import { subscribeToPriceAlert } from "@/lib/prices/alerts";

// Abonarea la alerta de preț (formularul de pe pagina produsului). Limită simplă pe IP, ca formularul să nu fie folosit
// pentru a trimite emailuri de confirmare în masă.
const hits = new Map<string, number[]>();
const LIMIT_PER_HOUR = 8;

function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60 * 60 * 1000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.delete(hits.keys().next().value!);
  return recent.length > LIMIT_PER_HOUR;
}

export async function POST(request: NextRequest) {
  let body: { productId?: unknown; email?: unknown; consent?: unknown; website?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, result: "invalid" }, { status: 400 });
  }
  if (body.website) return NextResponse.json({ ok: true, result: "sent" }); // capcana pentru boți
  if (body.consent !== true) return NextResponse.json({ ok: false, result: "invalid" }, { status: 400 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "necunoscut";
  if (limited(ip)) return NextResponse.json({ ok: false, result: "limited" }, { status: 429 });

  try {
    const result = await subscribeToPriceAlert(String(body.productId ?? ""), String(body.email ?? ""));
    return NextResponse.json({ ok: result === "sent" || result === "already-active", result }, { status: result === "invalid" ? 400 : 200 });
  } catch (error) {
    console.error("Abonarea la alerta de preț a eșuat:", error);
    return NextResponse.json({ ok: false, result: "error" }, { status: 500 });
  }
}
