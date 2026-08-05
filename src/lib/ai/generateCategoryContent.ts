import Anthropic from "@anthropic-ai/sdk";

export interface CategoryContentInput {
  categoryGroup: string;
  category?: string | null; // null/lipsă = generăm pentru pagina grupului, nu a unei subcategorii
}

export interface GeneratedFaqItem {
  question: string;
  answer: string;
}

export interface GeneratedCategoryContent {
  description: string;
  faq: GeneratedFaqItem[];
}

let client: Anthropic | null = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY nu este configurat în .env");
  }
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

// Model ieftin (Haiku) — se generează o singură dată per categorie/subcategorie
// (~20 apeluri în total), dar tot nu are rost un model scump pentru text listing SEO.
const MODEL = "claude-haiku-4-5-20251001";

function buildPrompt({ categoryGroup, category }: CategoryContentInput) {
  const subject = category ? `subcategoria "${category}" (parte din "${categoryGroup}")` : `categoria "${categoryGroup}"`;

  return `Ești redactorul SEO al farmatic.ro — un magazin afiliat românesc de produse farmaceutice, naturiste și suplimente alimentare. Scrii textul care apare sub grila de produse a unei pagini de categorie, pentru ${subject}.

Scopul textului este să se poziționeze în Google pentru cuvintele-cheie reale pe care le caută cumpărătorii români când vor să cumpere astfel de produse (ex: "[produs] preț", "[produs] beneficii", "cel mai bun [produs]", "cum se alege [produs]") — deci scrie natural, dar include variații firești ale acestor tipuri de căutări, nu doar propoziții generice.

Reguli obligatorii:
- Limba română, ton clar și de încredere, nu publicitar agresiv.
- NU inventa beneficii medicale nesusținute și NU afirma că produsele tratează/vindecă boli.
- Text simplu, în 2 paragrafe (fără headinguri, fără markdown, fără liste) — se afișează ca text simplu sub produse.
- Lungime: 120-200 cuvinte.
- Generează și 4 întrebări frecvente (FAQ) pe care le-ar căuta cineva înainte să cumpere din această categorie, cu răspunsuri scurte (1-2 propoziții).

Răspunde STRICT cu un obiect JSON valid, fără text în plus, fără code fences, cu exact cheile:
{"description": "...", "faq": [{"question": "...", "answer": "..."}]}
- "faq": array cu exact 4 obiecte {"question", "answer"}.`;
}

function extractJson(text: string): GeneratedCategoryContent {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Răspunsul Claude nu conține JSON valid");
  }
  const parsed = JSON.parse(text.slice(start, end + 1));
  if (!parsed.description) {
    throw new Error("Răspunsul Claude nu are câmpul așteptat (description)");
  }
  const faq: GeneratedFaqItem[] = Array.isArray(parsed.faq)
    ? parsed.faq
        .filter((item: unknown): item is Record<string, unknown> => !!item && typeof item === "object")
        .map((item: Record<string, unknown>) => ({
          question: String(item.question ?? ""),
          answer: String(item.answer ?? ""),
        }))
        .filter((item: GeneratedFaqItem) => item.question && item.answer)
    : [];

  return { description: String(parsed.description), faq };
}

export async function generateCategoryContent(input: CategoryContentInput): Promise<GeneratedCategoryContent> {
  const anthropic = getClient();
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1200,
    messages: [{ role: "user", content: buildPrompt(input) }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude nu a returnat conținut text");
  }

  return extractJson(textBlock.text);
}
