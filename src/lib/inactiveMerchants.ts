import { prisma } from "@/lib/prisma";

/**
 * Programe de afiliere 2Performant în care nu mai suntem activi: programul a fost închis sau
 * suspendat, ori afilierea noastră a fost oprită. Linkurile spre ele nu mai aduc comision, iar
 * 2Performant trimite avertismentul „Bad links to inactive partners” la fiecare click.
 *
 * Cât timp un program e pe listă, produsele lui:
 *  - sunt sărite la import și dezactivate la orice sincronizare, chiar dacă feed-ul le mai
 *    aduce sau nu se mai poate descărca (ies din /produse și din sitemap, iar pagina lor dă 404);
 *  - nu mai sunt trimise spre 2Performant din /go/: vizitatorul ajunge la produse similare de pe
 *    site, iar primul astfel de click le dezactivează pe toate, fără să aștepte sincronizarea.
 *
 * `merchant` = fragment din `Product.merchant`, cu litere mici. `from` = ziua (ora României) de la
 * care programul e inactiv, pentru închiderile anunțate dinainte; fără `from` = inactiv deja.
 * Când programul revine (afiliere reacceptată în 2Performant), șterge intrarea: produsele revin
 * singure la următoarea sincronizare, pentru că feed-ul le aduce iar ca active.
 */
interface InactiveMerchant {
  merchant: string;
  /** AAAA-LL-ZZ */
  from?: string;
  note: string;
}

export const INACTIVE_MERCHANTS: InactiveMerchant[] = [
  {
    merchant: "vioi",
    from: "2026-11-18",
    note: "vioi.ro — 2Performant a anunțat pe 6 nov. 2026 închiderea programului pe 18 nov. 2026",
  },
];

function inactiveEntries(now = new Date()): InactiveMerchant[] {
  return INACTIVE_MERCHANTS.filter((entry) => !entry.from || now >= new Date(`${entry.from}T00:00:00+02:00`));
}

export function isInactiveMerchant(merchant: string | null | undefined, now = new Date()): boolean {
  if (!merchant) return false;
  const normalized = merchant.trim().toLowerCase();
  return inactiveEntries(now).some((entry) => normalized.includes(entry.merchant));
}

/** Dezactivează produsele încă active ale programelor inactive; întoarce câte au fost dezactivate. */
export async function deactivateInactiveMerchantProducts(): Promise<number> {
  const entries = inactiveEntries();
  if (entries.length === 0) return 0;
  const { count } = await prisma.product.updateMany({
    where: {
      isActive: true,
      OR: entries.map((entry) => ({ merchant: { contains: entry.merchant, mode: "insensitive" as const } })),
    },
    data: { isActive: false },
  });
  return count;
}
