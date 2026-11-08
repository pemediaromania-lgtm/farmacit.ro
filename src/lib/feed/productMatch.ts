import type { RawFeedProduct } from "@/lib/feed/parse2performant";
import { significantWords, wordOverlap } from "@/lib/seo/slugMismatch";

type ExistingProduct = { id: string; externalId: string | null; name: string; merchant: string | null };

const normalizeName = (name: string) => name.trim().toLowerCase();

/** „https://www.Fornello.ro/” → „fornello.ro”, ca același magazin scris diferit să fie recunoscut. */
export function merchantKey(merchant: string | null | undefined): string {
  return (merchant ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:[/][/]/, "")
    .replace(/^www[.]/, "")
    .replace(/[/]+$/, "");
}

/** Același produs, scris puțin altfel (cel puțin jumătate din cuvintele numelui mai scurt în comun). */
export function namesLookAlike(a: string, b: string): boolean {
  const wordsA = significantWords(a);
  const wordsB = significantWords(b);
  if (wordsA.size === 0 || wordsB.size === 0) return normalizeName(a) === normalizeName(b);
  const [shorter, longer] = wordsA.size <= wordsB.size ? [wordsA, wordsB] : [wordsB, wordsA];
  return wordOverlap(shorter, longer) >= 0.5;
}

/**
 * Recunoaște, la sincronizare, rândul existent al unui produs din feed. `product_id` e id-ul intern al
 * comerciantului și se repetă între magazine — și chiar în același magazin (libratic: Paralela 45). Potrivit doar
 * după el, un produs scria peste altul și pagina rămânea cu adresa celui vechi. De aceea:
 *   1. același id ȘI nume asemănător (întâi la același magazin) — un nume complet diferit e alt produs;
 *   2. altfel, același magazin + același nume (produse fără id sau cu id schimbat).
 * Un rând potrivit o dată nu mai poate fi luat de alt produs în același import.
 */
export function createProductMatcher<T extends ExistingProduct>(existing: T[]) {
  const byId = new Map<string, T[]>();
  const byMerchantName = new Map<string, T>();
  for (const product of existing) {
    if (product.externalId) {
      const sameId = byId.get(product.externalId) ?? [];
      sameId.push(product);
      byId.set(product.externalId, sameId);
    }
    byMerchantName.set(`${merchantKey(product.merchant)}|${normalizeName(product.name)}`, product);
  }

  return {
    /**
     * Cheia unui produs nou: același produs apărut de două ori în feed nu e creat de două ori, dar două produse
     * diferite cu același id (alt nume) rămân două produse.
     */
    keyFor(item: RawFeedProduct): string {
      return `${merchantKey(item.merchant)}|${item.externalId ?? ""}|${normalizeName(item.name)}`;
    },

    find(item: RawFeedProduct, alreadyMatched: Set<string>): T | undefined {
      const merchant = merchantKey(item.merchant);
      const free = (product: T | undefined) => (product && !alreadyMatched.has(product.id) ? product : undefined);
      if (item.externalId) {
        const sameId = (byId.get(item.externalId) ?? []).filter(
          (product) => free(product) && namesLookAlike(product.name, item.name)
        );
        const best = sameId.find((product) => merchantKey(product.merchant) === merchant) ?? sameId[0];
        if (best) return best;
      }
      return free(byMerchantName.get(`${merchant}|${normalizeName(item.name)}`));
    },
  };
}
