// Black Friday 2026 la magazinele partenere: sigla „Black Friday” pe produsele din campania lor (BlackFridayBadge).
// Perioadele și regulile sunt luate de pe site-urile partenerilor pe 2026-11-03 (regulamente, bannere). Fiecare
// campanie se stinge singură la `until` (paginile sunt force-dynamic); unde partenerul n-a anunțat sfârșitul, 30 nov.

type Campaign = {
  /** Fragment din Product.merchant (din feed vine „vegis.ro”, „www.vegis.ro/”, „Vegis” etc.). */
  merchant: string;
  /** Începutul campaniei; lipsă = deja începută. */
  from?: string;
  /** Sfârșitul campaniei (exclusiv). */
  until: string;
  /**
   * Ce produse intră: toate (implicit), doar cele reduse în feed (campanie pe produse selectate — reducerea din feed
   * e singurul semn pe care-l avem) sau doar un brand.
   */
  only?: "reduse" | { brand: string };
};

const CAMPAIGNS: Campaign[] = [
  // Cerut de Paul; site-ul Vegis blochează verificarea automată (403), sfârșitul nu-l știm.
  { merchant: "vegis", until: "2026-12-01T00:00:00+02:00" },
  // Regulament: „BLACK FRIDAY - 10% discount pentru toate produsele Brainmax - 2.11 - 8.11.2026”.
  { merchant: "brainmarket", until: "2026-11-09T00:00:00+02:00", only: { brand: "brainmax" } },
  // „Din 6 noiembrie intră la reducere chiloții menstruali, discurile, costumele de baie...”; feed-ul n-are preț vechi.
  { merchant: "femieko", from: "2026-11-06T00:00:00+02:00", until: "2026-12-01T00:00:00+02:00" },
];

export type BlackFridayProduct = {
  merchant: string | null;
  brand: string | null;
  price: number | null;
  oldPrice: number | null;
};

function running(c: Campaign): boolean {
  const now = Date.now();
  return (!c.from || now >= Date.parse(c.from)) && now < Date.parse(c.until);
}

function campaignFor(merchant: string | null): Campaign | undefined {
  if (!merchant) return undefined;
  const m = merchant.toLowerCase();
  return CAMPAIGNS.find((c) => m.includes(c.merchant) && running(c));
}

/** Dacă magazinul are acum Black Friday (ex. pentru anunțul de pe prima pagină). */
export function campaignActive(merchant: string): boolean {
  return campaignFor(merchant) !== undefined;
}

export function isBlackFridayProduct(p: BlackFridayProduct): boolean {
  const c = campaignFor(p.merchant);
  if (!c) return false;
  if (c.only === "reduse") return p.price != null && p.oldPrice != null && p.oldPrice > p.price;
  if (c.only) return (p.brand ?? "").toLowerCase().includes(c.only.brand);
  return true;
}
