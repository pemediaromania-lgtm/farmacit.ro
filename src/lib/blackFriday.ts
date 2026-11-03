// Black Friday 2026 la magazinele partenere: sigla „Black Friday” pe produsele din campania lor (BlackFridayBadge)
// și bannerul de pe prima pagină (BlackFridayOffers). Datele vin din promoțiile 2Performant (export CSV de la Paul,
// 2026-11-03) și, unde lipsesc acolo, de pe site-urile partenerilor. Fiecare campanie se stinge singură la `until`
// (paginile sunt force-dynamic); unde partenerul n-a anunțat sfârșitul, 30 noiembrie.

type Campaign = {
  /** Fragment din Product.merchant (din feed vine „vegis.ro”, „www.vegis.ro/”, „Vegis” etc.). */
  merchant: string;
  /** Numele magazinului, în banner. */
  name: string;
  /** Oferta pe scurt, cum o anunță magazinul. */
  offer: string;
  /** Perioada, cum apare în banner. */
  period: string;
  /** Cod de reducere dat de magazin afiliaților, cu condițiile lui. */
  code?: string;
  codeNote?: string;
  /** Începutul campaniei; lipsă = deja începută. */
  from?: string;
  /** Sfârșitul campaniei (exclusiv). */
  until: string;
  /**
   * Ce produse primesc sigla: toate (implicit), doar cele reduse în feed (campanie pe produse selectate — reducerea
   * din feed e singurul semn pe care-l avem) sau doar un brand.
   */
  only?: "reduse" | { brand: string };
};

const CAMPAIGNS: Campaign[] = [
  {
    merchant: "vegis",
    name: "Vegis",
    offer: "Reduceri la suplimente, produse bio, apicole, uleiuri esențiale și cosmetice",
    period: "6–22 noiembrie",
    from: "2026-11-06T08:30:00+02:00",
    until: "2026-11-23T00:00:00+02:00",
  },
  {
    merchant: "brainmarket",
    name: "BrainMarket",
    offer: "−10% la toate produsele BrainMax",
    period: "2–8 noiembrie",
    until: "2026-11-09T00:00:00+02:00",
    only: { brand: "brainmax" },
  },
  {
    merchant: "vetro",
    name: "Vetro",
    offer: "Până la −19% la toate produsele cu preț întreg, −9% la cele deja reduse",
    period: "6–8 noiembrie",
    code: "VED5",
    codeNote: "−5% în plus la comenzile de minimum 300 lei + TVA",
    from: "2026-11-06T00:00:00+02:00",
    until: "2026-11-09T00:00:00+02:00",
  },
  // Nu e în promoțiile 2Performant; de pe femieko.ro: „Din 6 noiembrie intră la reducere...”. Feed-ul n-are preț vechi.
  {
    merchant: "femieko",
    name: "Femieko",
    offer: "Reduceri la chiloți menstruali, discuri și costume de baie",
    period: "din 6 noiembrie",
    from: "2026-11-06T00:00:00+02:00",
    until: "2026-12-01T00:00:00+02:00",
  },
];

/** Cu câte zile înainte de start apare o campanie în banner, ca anunț. */
const ANNOUNCE_DAYS = 4;
const DAY = 24 * 60 * 60 * 1000;

/**
 * Weekendul Black Friday în România (vineri 6 – duminică 8 noiembrie 2026), când pornesc majoritatea partenerilor.
 * Pentru numărătoarea inversă din banner (BlackFridayCountdown), care dispare după final.
 */
export const BLACK_FRIDAY_STARTS = "2026-11-06T00:00:00+02:00";
export const BLACK_FRIDAY_ENDS = "2026-11-09T00:00:00+02:00";

export function countdownVisible(): boolean {
  return Date.now() < Date.parse(BLACK_FRIDAY_ENDS);
}

export type BlackFridayProduct = {
  merchant: string | null;
  brand: string | null;
  price: number | null;
  oldPrice: number | null;
};

export type BannerCampaign = Pick<Campaign, "merchant" | "name" | "offer" | "period" | "code" | "codeNote"> & {
  started: boolean;
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

export function isBlackFridayProduct(p: BlackFridayProduct): boolean {
  const c = campaignFor(p.merchant);
  if (!c) return false;
  if (c.only === "reduse") return p.price != null && p.oldPrice != null && p.oldPrice > p.price;
  if (c.only) return (p.brand ?? "").toLowerCase().includes(c.only.brand);
  return true;
}

/** Campaniile din banner: cele în curs, apoi cele care încep în următoarele ANNOUNCE_DAYS zile. */
export function bannerCampaigns(): BannerCampaign[] {
  const now = Date.now();
  return CAMPAIGNS.filter((c) => now < Date.parse(c.until) && (!c.from || Date.parse(c.from) - now <= ANNOUNCE_DAYS * DAY))
    .map(({ merchant, name, offer, period, code, codeNote, from }) => ({
      merchant,
      name,
      offer,
      period,
      code,
      codeNote,
      started: !from || now >= Date.parse(from),
    }))
    .sort((a, b) => Number(b.started) - Number(a.started));
}
