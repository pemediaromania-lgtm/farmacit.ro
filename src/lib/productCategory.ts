/**
 * Taxonomie pe două niveluri: un grup (afișat pe homepage, puține la număr) și o
 * subcategorie (specifică, folosită pentru filtrare pe /produse). Feed-urile
 * 2Performant fie nu trimit deloc o categorie (ex: springfarma), fie trimit una
 * brută, necontrolată (ex: manuka -> "Manuka Honey"), fie catalogul e într-o altă
 * limbă (ex: eumed.ro — nume de produse în germană) — în toate cazurile,
 * clasificarea reală se face aici, ca site-ul să aibă mereu o taxonomie unică,
 * consistentă între comercianți/limbi, nu una dependentă de cum a denumit fiecare
 * feed lucrurile. Cuvintele-cheie includ deci și echivalente în germană acolo
 * unde am avut nevoie (feed-uri germane sunt frecvente în cataloagele de
 * farmacie 2Performant).
 *
 * Regulile sunt verificate în ordine, de la cele mai specifice la cele mai
 * generale, iar prima potrivire câștigă (ex: "cremă depilatoare" trebuie să cadă
 * în "Epilare", nu în "Îngrijire personală", deci "depilat" e verificat înaintea
 * lui "cremă").
 */
export interface CategoryRule {
  group: string;
  name: string;
  keywords: string[];
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    // Doar produse chiar pe bază de miere de Manuka (miere, dropsuri, gel, gradele
    // MGO/UMF) — NU cosmetice care doar folosesc "manuka" ca nume/ingredient de
    // marketing (ex: linia "Manuka Bio"/Ziaja de șampon, cremă, apă micelară).
    group: "Suplimente și sănătate naturistă",
    name: "Miere de Manuka",
    keywords: ["miere de manuka", " mgo", " umf"],
  },
  {
    // Foarte prezent în feed-uri germane (ex: eumed.ro) — remedii omeopate cu
    // nume latine și potențe D/C, complet distincte de suplimentele obișnuite.
    group: "Suplimente și sănătate naturistă",
    name: "Remedii homeopate",
    keywords: ["globuli", "dilution", "homoopath", "homöopath"],
  },
  {
    // Segment complet distinct de restul catalogului (ex: e-potion.ro) — kit-uri,
    // lichide, rezistențe și accesorii pentru țigări electronice.
    group: "Vaping",
    name: "Lichide și dispozitive vaping",
    keywords: [
      "lichid",
      "vaporesso",
      "voopoo",
      "geekvape",
      "innokin",
      "aspire",
      "oxva",
      "elf bar",
      "elfliq",
      "elfbar",
      "lost vape",
      "smok",
      "vozol",
      "riot squad",
      "cartus",
      "rezistenta",
      "atomizor",
      "nicsalts",
      "kit vap",
      "tigara electronica",
      "vape ",
      "pouch",
      "pliculete",
      "aroma concentrata",
      "vuse",
    ],
  },
  {
    group: "Mama și copilul",
    name: "Mama și copilul",
    keywords: [
      "biberon",
      "scutec",
      "bebelus",
      "bebe ",
      "suzeta",
      "lapte praf",
      "hrana bebe",
      "carucior",
      "tetina",
      "tetine",
      "cana cu prindere",
      "servetele umede",
      "baveta",
      "windeln",
      "schnuller",
      "babyflasche",
    ],
  },
  {
    group: "Îngrijire personală și frumusețe",
    name: "Machiaj",
    keywords: [
      "fond de ten",
      "mascara",
      "eyeliner",
      "ruj",
      "luciu de buze",
      "luciu pentru buze",
      "tus de ochi",
      "iluminator",
      "pudra",
      "corector",
      "gene false",
      "fard",
      "paleta",
      "primer",
      "oja",
    ],
  },
  {
    group: "Îngrijire personală și frumusețe",
    name: "Epilare",
    keywords: ["depilat", "epilare", "ceara de corp", "benzi depilatoare"],
  },
  {
    group: "Îngrijire personală și frumusețe",
    name: "Protecție solară",
    keywords: ["protectie solara", "spf", "after sun", "plaja", "sonnenschutz", "lichtschutzfaktor"],
  },
  {
    group: "Igienă",
    name: "Igienă orală",
    keywords: [
      "periuta",
      "periute",
      "pasta de dinti",
      "apa de gura",
      "ata dentara",
      "dentar",
      "irigator bucal",
      "irigator oral",
      "dus bucal",
      "storcator",
      "extruder",
      "dispenser",
      "zahnbürste",
      "zahncreme",
      "zahnpasta",
      "mundwasser",
      "mundspülung",
    ],
  },
  {
    group: "Igienă",
    name: "Igienă intimă",
    // "irigator" e ambiguu singur — feed-uri de igienă dentară vând și "irigator
    // bucal" (dental water flosser), verificat mai sus, înaintea acestei reguli.
    keywords: [
      "absorbante",
      "tampoane",
      "igiena intima",
      "irigator vaginal",
      "irigator intim",
      "inkontinenz",
      "menstrual",
      "lenjerie intima",
      "produse intime",
    ],
  },
  {
    group: "Sănătate și parafarmaceutice",
    name: "Îngrijire răni și parafarmaceutice",
    keywords: [
      "plasture",
      "plasturi",
      "pansament",
      "compresa",
      "comprese",
      "test de sarcina",
      "ciorapi compresivi",
      "centura abdominala",
      "aleza",
      "unguent",
      "verband",
      "pflaster",
      "kompresse",
      "desinfektion",
      "wundpflaster",
      "mullkomp",
      "mullbinde",
      "gipsbinde",
      "fixierbinde",
    ],
  },
  {
    group: "Suplimente și sănătate naturistă",
    name: "Suplimente și vitamine",
    keywords: [
      "vitamina",
      "supliment",
      "magneziu",
      "calciu",
      "zinc",
      "omega",
      "probiotic",
      "coenzima",
      "imun",
      "minerale",
      "aminoacizi",
      "colagen",
      "multivitamine",
      "capsule",
      "comprimate",
      "extract",
      "ginseng",
      "propolis",
      "sirop",
      "plicuri",
      "picaturi",
      "fiole",
      "jeleuri",
      "efervescente",
      "tablete",
      "pastile",
      "vitamin",
      "kapseln",
      "tabletten",
      "brausetabletten",
      "kautabletten",
      "mineralien",
      "tropfen",
      "ampullen",
      "mischung",
      "injektionslösung",
      "augentropfen",
      "dragees",
    ],
  },
  {
    group: "Suplimente și sănătate naturistă",
    name: "Ceaiuri și plante",
    keywords: [
      "ceai",
      "tinctura",
      "infuzie",
      "plante medicinale",
      // "tee" (german pt. ceai) era prea scurt/riscant — prindea substring-ul din
      // "Teen ..." (nume de produs englezesc). Rămân doar forme mai specifice.
      " tee ",
      "kräutertee",
      "tinktur",
      "kräuter",
      "extrakt",
      "heilpflanzensäfte",
    ],
  },
  {
    group: "Sănătate și parafarmaceutice",
    name: "Dispozitive medicale",
    keywords: [
      "tensiometru",
      "termometru",
      "glucometru",
      "oximetru",
      "inhalator",
      "cantar",
      "blutdruckmessgerät",
      "fieberthermometer",
      "teststreifen",
      "lanzetten",
      "blutzucker",
      "manschette",
      "nadeln",
      "kanüle",
    ],
  },
  {
    group: "Suplimente și sănătate naturistă",
    name: "Alimente și băuturi funcționale",
    keywords: ["ciocolata", "cafea", "nutritie enterala", "resource", "trinkflasche", "trinknahrung"],
  },
  {
    group: "Îngrijire personală și frumusețe",
    name: "Îngrijire personală",
    keywords: [
      "crema",
      "gel de dus",
      "sampon",
      "balsam",
      "ulei esenti",
      "uleiuri esenti",
      "ulei de",
      "unt de",
      "parfum",
      "sapun",
      "lotiune",
      "spuma",
      "deodorant",
      "ser ",
      "serum",
      "exfoliant",
      "scrub",
      "apa micelara",
      "gel de curatare",
      "fluid",
      "masca",
      "creme",
      "shampoo",
      "lotion",
      "öl",
      "seife",
      "salbe",
      "duschgel",
      "körperlotion",
      "handcreme",
      "gesichtscreme",
    ],
  },
];

const FALLBACK_CATEGORY = "Diverse";
const FALLBACK_GROUP = "Diverse";

/**
 * Unele feed-uri trimit o categorie proprie brută (ex: "Manuka Honey") care nu
 * corespunde taxonomiei noastre — aici se normalizează valorile cunoscute la
 * perechea (grup, subcategorie) corectă. O categorie brută necunoscută NU e
 * folosită direct (am rămâne cu categorii necontrolate, unice per feed) — se
 * clasifică după cuvinte-cheie din titlu, ca orice alt produs.
 */
const FEED_CATEGORY_OVERRIDES: Record<string, { group: string; name: string }> = {
  "manuka honey": { group: "Suplimente și sănătate naturistă", name: "Miere de Manuka" },
};

/**
 * Feed-urile sunt inconsistente la diacritice ("Cartuș" vs "Cartus" pentru
 * același tip de produs, uneori chiar în același catalog) — se compară totul
 * fără diacritice/umlauturi, altfel un cuvânt-cheie scris fără diacritice
 * (convenția folosită mai sus) nu s-ar potrivi cu un nume care le are.
 */
function stripDiacritics(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const STRIPPED_RULES = CATEGORY_RULES.map((rule) => ({
  ...rule,
  keywords: rule.keywords.map(stripDiacritics),
}));

export interface ProductClassification {
  category: string;
  categoryGroup: string;
}

export function classifyProduct(name: string, rawCategory?: string | null): ProductClassification {
  if (rawCategory) {
    const override = FEED_CATEGORY_OVERRIDES[rawCategory.trim().toLowerCase()];
    if (override) return { category: override.name, categoryGroup: override.group };
  }

  const normalized = stripDiacritics(` ${name.toLowerCase()} `);
  for (const rule of STRIPPED_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return { category: rule.name, categoryGroup: rule.group };
    }
  }
  return { category: FALLBACK_CATEGORY, categoryGroup: FALLBACK_GROUP };
}

export const ALL_SUBCATEGORY_NAMES: string[] = [...CATEGORY_RULES.map((rule) => rule.name), FALLBACK_CATEGORY];

/** Perechile (grup, subcategorie) reale ale taxonomiei — fără categoria-fallback "Diverse", care nu are o temă coerentă de cuvinte-cheie. */
export const ALL_SUBCATEGORIES: { group: string; name: string }[] = CATEGORY_RULES.map((rule) => ({
  group: rule.group,
  name: rule.name,
}));

/** Grupuri de nivel superior, în ordinea în care trebuie afișate (Diverse ultimul). */
export const ALL_GROUPS: string[] = [
  "Suplimente și sănătate naturistă",
  "Îngrijire personală și frumusețe",
  "Igienă",
  "Mama și copilul",
  "Sănătate și parafarmaceutice",
  "Vaping",
  FALLBACK_GROUP,
];

/** Nume de fișier stabil pentru o imagine generată (grup sau categorie), fără diacritice/spații. */
export function categoryImageSlug(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function categoryImagePublicPath(label: string): string {
  return `/uploads/categories/${categoryImageSlug(label)}.png`;
}
