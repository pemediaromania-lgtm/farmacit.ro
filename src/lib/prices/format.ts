/** Formatarea pentru modulul de prețuri — proprie, ca modulul să fie identic pe toate site-urile de afiliere. */

/** „1.234,50 lei” (fără zecimale când sunt ,00). */
export function formatPrice(value: number, currency: string | null = "RON"): string {
  const decimals = Math.abs(value - Math.round(value)) < 0.005 ? 0 : 2;
  const amount = value.toLocaleString("ro-RO", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return !currency || currency.toUpperCase() === "RON" ? `${amount} lei` : `${amount} ${currency}`;
}

/** „vegis.ro”, „fornello.ro” — numele magazinului din câmpul merchant al feed-ului („https://www.fornello.ro/”). */
export function storeName(merchant: string | null | undefined): string {
  return (merchant ?? "").trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "") || "alt magazin";
}

/** „19 nov. 2026” */
export function formatDay(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Bucharest" });
}
