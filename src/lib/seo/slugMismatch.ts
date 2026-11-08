/**
 * Adresa unui produs (slug) se face o singură dată, din numele lui. Dacă numele de acum nu mai are aproape nimic
 * în comun cu adresa, rândul a fost suprascris cu alt produs (vechea potrivire doar după `product_id`, care se repetă
 * între magazine) — ex. libratic: /produse/almanah-2015 arăta „Cenușăreasa”.
 */
const plain = (text: string) => text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

/** Cuvintele semnificative: minim 4 litere, fără numere pure (ani, cantități). */
export function significantWords(text: string): Set<string> {
  return new Set(
    plain(text)
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length >= 4 && !/^[0-9]+$/.test(word))
  );
}

/** Cât din `a` se regăsește în `b` (0–1). */
export function wordOverlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0) return 1;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared++;
  return shared / a.size;
}

/** false = adresa e a altui produs decât cel afișat. Adresele fără niciun cuvânt semnificativ nu se judecă. */
export function slugMatchesName(slug: string, name: string): boolean {
  const slugWords = significantWords(slug.replace(/-[0-9]+$/, "")); // fără sufixul de unicitate „-2”
  if (slugWords.size === 0) return true;
  return wordOverlap(slugWords, significantWords(name)) >= 0.3;
}
