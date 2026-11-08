import { prisma } from "@/lib/prisma";

/**
 * Coloanele adăugate după mutarea pe VPS se creează și la pornirea serverului, dacă lipsesc — idempotent
 * (IF NOT EXISTS), ca site-ul să nu depindă de pasul de migrare din Coolify. Aceeași modificare e și în
 * prisma/migrations, tot cu IF NOT EXISTS, deci cele două nu se ciocnesc.
 */
export async function ensureSchema(): Promise<void> {
  try {
    // Toate pozele produsului din feed (prima = imageUrl), pentru galeria de pe pagina produsului.
    await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "images" TEXT[] DEFAULT ARRAY[]::TEXT[]`);
  } catch (error) {
    console.error("[ensureSchema] Nu am putut adăuga coloana Product.images:", error);
  }
}

export async function productImagesColumnExists(): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n FROM information_schema.columns WHERE table_name = 'Product' AND column_name = 'images'`;
  return (rows[0]?.n ?? 0) > 0;
}
