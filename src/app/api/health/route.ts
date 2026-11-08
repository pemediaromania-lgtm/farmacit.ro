import { NextRequest, NextResponse } from "next/server";
import { schemaStatus } from "@/lib/db/ensureSchema";
import { slugMismatchReport } from "@/lib/seo/slugMismatchReport";

export const dynamic = "force-dynamic";

/**
 * Verificare după deploy: serverul răspunde și schema bazei are ce îi trebuie codului.
 * `?nepotriviri` adaugă raportul produselor a căror adresă e a altui produs (doar date publice: adrese și nume).
 */
export async function GET(request: NextRequest) {
  const schema = await schemaStatus().catch(() => null);
  const body: Record<string, unknown> = { ok: true, schema };
  if (request.nextUrl.searchParams.has("nepotriviri")) {
    body.nepotriviri = await slugMismatchReport();
  }
  return NextResponse.json(body);
}
