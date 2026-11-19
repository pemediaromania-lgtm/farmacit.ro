import { NextRequest, NextResponse } from "next/server";
import { unsubscribePriceAlert } from "@/lib/prices/alerts";

// Dezabonarea „one-click” din antetul List-Unsubscribe (Gmail, Yahoo trimit POST aici). GET duce la pagina de dezabonare.
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (token) await unsubscribePriceAlert(token);
  return new NextResponse(null, { status: 200 });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  return new NextResponse(null, { status: 303, headers: { Location: `/alerta-pret/dezabonare?token=${encodeURIComponent(token)}` } });
}
