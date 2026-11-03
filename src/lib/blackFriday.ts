// Black Friday 2026 la magazinele partenere: insigna pe produsele lor și anunțul de pe prima pagină.
// Cerut de Paul (2026-11-03) pentru Vegis. Se stinge singur după 30 noiembrie 2026 (paginile sunt force-dynamic).
const ENDS_AT = Date.parse("2026-12-01T00:00:00+02:00");

/** Fragmente din numele magazinului (din feed vine „vegis.ro”, „www.vegis.ro/”, „Vegis” etc.). */
const MERCHANTS = ["vegis"];

/** Fragmentul folosit în căutarea din baza de date pentru anunțul de pe prima pagină. */
export const BLACK_FRIDAY_MERCHANT = MERCHANTS[0];

export function blackFridayActive(): boolean {
  return Date.now() < ENDS_AT;
}

export function isBlackFridayProduct(merchant: string | null | undefined): boolean {
  if (!merchant || !blackFridayActive()) return false;
  const m = merchant.toLowerCase();
  return MERCHANTS.some((part) => m.includes(part));
}
