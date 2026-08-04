import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

/**
 * Servește fișierele din public/uploads (imagini generate — coperți articole,
 * categorii) direct de pe disc, la fiecare cerere. Pe Railway, aceste fișiere
 * trăiesc pe un Volume montat la runtime peste public/uploads — folderul e gol
 * la build, deci Next.js nu le "vede" ca fișiere statice cunoscute prin
 * mecanismul lui obișnuit pentru public/ (bazat pe ce exista la build). Un route
 * handler citește mereu live de pe disc, deci nu are problema asta.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;

  if (segments.some((s) => s.includes("..") || s.includes("\\"))) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filePath = path.join(process.cwd(), "public", "uploads", ...segments);

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
