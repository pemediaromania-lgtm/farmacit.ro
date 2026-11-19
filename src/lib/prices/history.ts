import { prisma } from "@/lib/prisma";

/**
 * Istoricul de preț al produselor (cerut de Paul pe 2026-11-19, pe toate site-urile de afiliere). Feed-ul ne dă doar prețul
 * de azi, așa că îl păstrăm noi: după fiecare sincronizare, fiecare produs activ al cărui preț s-a schimbat față de ultimul
 * punct (sau care n-are încă niciunul) primește un punct nou în PricePoint. Un punct = „de la data asta, prețul a fost X”.
 * Același fișier pe farmatic, libratic, intimatic, jucatic și casain2.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Adaugă în istoric prețurile schimbate de la ultima sincronizare. Întoarce câte puncte noi au intrat. */
export async function recordPriceSnapshot(): Promise<number> {
  return prisma.$executeRaw`
    INSERT INTO "PricePoint" ("id", "productId", "price", "oldPrice", "recordedAt")
    SELECT gen_random_uuid()::text, p."id", p."price", p."oldPrice", now()
    FROM "Product" p
    LEFT JOIN LATERAL (
      SELECT pp."price" FROM "PricePoint" pp
      WHERE pp."productId" = p."id"
      ORDER BY pp."recordedAt" DESC
      LIMIT 1
    ) last ON true
    WHERE p."isActive" AND p."price" IS NOT NULL AND p."price" > 0
      AND (last."price" IS NULL OR abs(last."price" - p."price") >= 0.01)`;
}

export interface PricePointView {
  /** ISO, ca să treacă spre componenta de client. */
  date: string;
  price: number;
}

export interface PriceHistoryView {
  /** De când urmărim prețul (primul punct). */
  since: string;
  /** Punctele din ultimele 180 de zile, plus cel de dinainte (prețul de la începutul ferestrei), crescător. */
  points: PricePointView[];
  current: number;
  min30: number;
  max30: number;
  /** Prețul de acum 30 de zile (sau de la începutul urmăririi, dacă e mai recent). */
  price30DaysAgo: number;
  /** De câte zile urmărim prețul (cel mult 30 pentru comparația de mai sus). */
  windowDays: number;
  /** Prețul s-a schimbat măcar o dată de când îl urmărim. */
  hasChanges: boolean;
}

/** Prețul în vigoare la un moment dat: ultimul punct de dinainte (sau de atunci). */
function priceAt(points: PricePointView[], time: number): number | null {
  let price: number | null = null;
  for (const p of points) {
    if (new Date(p.date).getTime() <= time) price = p.price;
    else break;
  }
  return price;
}

export async function getPriceHistory(productId: string, currentPrice: number | null): Promise<PriceHistoryView | null> {
  if (currentPrice == null || currentPrice <= 0) return null;
  const windowStart = new Date(Date.now() - 180 * DAY_MS);
  const [first, inWindow, before] = await Promise.all([
    prisma.pricePoint.findFirst({ where: { productId }, orderBy: { recordedAt: "asc" }, select: { recordedAt: true } }),
    prisma.pricePoint.findMany({
      where: { productId, recordedAt: { gte: windowStart } },
      orderBy: { recordedAt: "asc" },
      select: { recordedAt: true, price: true },
    }),
    prisma.pricePoint.findFirst({
      where: { productId, recordedAt: { lt: windowStart } },
      orderBy: { recordedAt: "desc" },
      select: { recordedAt: true, price: true },
    }),
  ]);
  if (!first) return null;

  const points: PricePointView[] = [...(before ? [before] : []), ...inWindow].map((p) => ({ date: p.recordedAt.toISOString(), price: p.price }));
  const now = Date.now();
  const since = first.recordedAt.getTime();
  const start30 = Math.max(now - 30 * DAY_MS, since);
  // Prețurile din ultimele 30 de zile: cel de la începutul ferestrei, cele schimbate în fereastră și cel de acum.
  const inLast30 = [priceAt(points, start30), ...points.filter((p) => new Date(p.date).getTime() > start30).map((p) => p.price), currentPrice].filter(
    (v): v is number => v != null
  );

  return {
    since: first.recordedAt.toISOString(),
    points,
    current: currentPrice,
    min30: Math.min(...inLast30),
    max30: Math.max(...inLast30),
    price30DaysAgo: priceAt(points, start30) ?? currentPrice,
    windowDays: Math.max(1, Math.round((now - start30) / DAY_MS)),
    hasChanges: new Set([...points.map((p) => p.price.toFixed(2)), currentPrice.toFixed(2)]).size > 1,
  };
}
