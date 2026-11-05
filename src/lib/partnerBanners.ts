// Bannere de afiliere 2Performant ale magazinelor din feed-ul nostru (primite de la Paul, 2026-11-05). Apar în
// caruselul din fereastra de oferte din stânga jos (PromoCarousel), după reclama ESIMpatic. Fiecare banner anunță o
// campanie cu termen, așa că dispare singur la `until`: un banner cu o reducere încheiată ar fi înșelător.
// Bannerele magazinelor care nu sunt în feed-ul site-ului nu intră aici.
//
// Primite și lăsate deoparte: pfarma.ro (nu e în feed), vedrashop.ro Therasal −10% (1–31 octombrie, încheiată),
// apiland.ro Tonic junior −30% (10–20 octombrie, încheiată).

export type PartnerBanner = {
  /** Fragment din Product.merchant (din feed vine „brainmarket.ro/”, „www.herbagetica.ro” etc.). */
  merchant: string;
  /** Numele magazinului, în eticheta „Publicitate”. */
  name: string;
  /** Linkul de tracking 2Performant — click-ul îl contorizează ei, nu /go/. */
  href: string;
  src: string;
  width: number;
  height: number;
  /** Începutul campaniei; lipsă = deja începută. */
  from?: string;
  /** Sfârșitul campaniei din banner (exclusiv). */
  until: string;
};

const PARTNER_BANNERS: PartnerBanner[] = [
  {
    // Black Friday −10% la Brainmax, 2–8 noiembrie (aceeași campanie ca în blackFriday.ts).
    merchant: "brainmarket",
    name: "BrainMarket.ro",
    href: "https://event.2performant.com/events/click?ad_type=banner&unique=0948a9989&aff_code=138f5b69f&campaign_unique=0cc892879",
    src: "https://img.2performant.com/system/paperclip/banner_pictures/pics/274080/original/274080.jpg",
    width: 160,
    height: 600,
    until: "2026-11-09T00:00:00+02:00",
  },
  {
    // −40% la gamele antiviral și antiinflamator, „Ai grijă de tine în sezonul rece!”, 22.10–30.11.2026
    // (regulamentul de pe herbagetica.ro/regulament-herbagetica).
    merchant: "herbagetica",
    name: "Herbagetica.ro",
    href: "https://event.2performant.com/events/click?ad_type=banner&unique=853a21467&aff_code=138f5b69f&campaign_unique=853fff54b",
    src: "https://img.2performant.com/system/paperclip/banner_pictures/pics/273434/original/273434.jpg",
    width: 300,
    height: 250,
    until: "2026-12-01T00:00:00+02:00",
  },
];

function isRunning(b: PartnerBanner, now: number): boolean {
  return (!b.from || now >= Date.parse(b.from)) && now < Date.parse(b.until);
}

export function activePartnerBanners(now = Date.now()): PartnerBanner[] {
  return PARTNER_BANNERS.filter((b) => isRunning(b, now));
}
