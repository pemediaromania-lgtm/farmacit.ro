/**
 * Pagini de produs care aduc trafic din Google și trebuie să rămână indexate chiar fără articol sau recenzii
 * (Search Console → Performanță → Pagini). Goală pe 2026-11-08: toate produsele de dinainte de regula ritmului
 * rămân oricum indexabile (vezi INDEXING_CUTOFF în indexable.ts).
 */
export const KEEP_INDEXED_SLUGS: string[] = [];
