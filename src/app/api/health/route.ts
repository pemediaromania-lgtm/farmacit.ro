import { NextResponse } from "next/server";
import { productImagesColumnExists } from "@/lib/db/ensureSchema";

export const dynamic = "force-dynamic";

/** Verificare după deploy: serverul răspunde și schema bazei are coloanele de care depinde codul. */
export async function GET() {
  const productImages = await productImagesColumnExists().catch(() => false);
  return NextResponse.json({ ok: true, schema: { productImages } });
}
