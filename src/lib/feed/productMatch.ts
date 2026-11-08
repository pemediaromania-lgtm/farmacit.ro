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
function namesLookAlike(a: string, b: string): boolean {
  const wordsA = significantWords(a);
  const wordsB = significantWords(b);
  if (wordsA.size === 0 || wordsB.size === 0) return normalizeName(a) === normalizeName(b);
  const [shorter, longer] = wordsA.size <= wordsB.size ? [wordsA, wordsB] : [wordsB, wordsA];
  return wordOverlap(shorter, longer) >= 0.5;
}

/**
 * Recunoaște, la sincronizare, rândul existent al unui produs din feed. `product_id` e id-ul intern al
 * comerciantului și se repetă între magazine (uneori și în același magazin), deci id-ul singur nu ajunge: potrivit
 * doar după el, un produs scria peste altul și pagina rămânea cu adresa celui vechi. Ordinea:
 *   1. același magazin + același id;
 *   2. același id, magazin scris altfel în baza veche — doar dacă numele seamănă (e clar același produs);
 *   3. același magazin + același nume (produse fără id).
 * Un rând deja potrivit în acest import nu mai poate fi luat de alt produs.
 */
export function createProductMatcher<T extends ExistingProduct>(existing: T[]) {
  const byMerchantId = new Map<string, T>();
  const byId = new Map<string, T[]>();
  const byMerchantName = new Map<string, T>();
  for (const product of existing) {
    const merchant = merchantKey(product.merchant);
    if (product.externalId) {
      byMerchantId.set(`${merchant}|${product.externalId}`, product);
      const sameId = byId.get(product.externalId) ?? [];
      sameId.push(product);
      byId.set(product.externalId, sameId);
    }
    byMerchantName.set(`${merchant}|${normalizeName(product.name)}`, product);
  }

  return {
    /** Cheia unui produs nou, ca același produs apărut de două ori în feed să nu fie creat de două ori. */
    keyFor(item: RawFeedProduct): string {
      const merchant = merchantKey(item.merchant);
      return item.externalId ? `${merchant}|id:${item.externalId}` : `${merchant}|name:${normalizeName(item.name)}`;
    },

    find(item: RawFeedProduct, alreadyMatched: Set<string>): T | undefined {
      const merchant = merchantKey(item.merchant);
      const free = (product: T | undefined) => (product && !alreadyMatched.has(product.id) ? product : undefined);
      if (item.externalId) {
        const sameMerchant = free(byMerchantId.get(`${merchant}|${item.externalId}`));
        if (sameMerchant) return sameMerchant;
        const sameProduct = (byId.get(item.externalId) ?? []).find(
          (product) => free(product) && namesLookAlike(product.name, item.name)
        );
        if (sameProduct) return sameProduct;
      }
      return free(byMerchantName.get(`${merchant}|${normalizeName(item.name)}`));
    },
  };
}
