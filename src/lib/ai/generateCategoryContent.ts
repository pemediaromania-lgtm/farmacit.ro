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
  metaTitle: string;
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

  return `Ești redactorul SEO al farmatic.ro — un magazin afiliat românesc de produse farmaceutice, naturiste și suplimente alimentare. Scrii pachetul SEO (titlu de pagină + text + FAQ) pentru pagina de categorie a ${subject}.

Scopul e să se poziționeze în Google pentru cuvintele-cheie reale pe care le caută cumpărătorii români când vor să cumpere astfel de produse (ex: "[produs] preț", "[produs] beneficii", "cel mai bun [produs]", "cum se alege [produs]") — deci scrie natural, dar include variații firești ale acestor tipuri de căutări, nu doar propoziții generice.

Reguli obligatorii:
- Limba română, ton clar și de încredere, nu publicitar agresiv.
- NU inventa beneficii medicale nesusținute și NU afirma că produsele tratează/vindecă boli.
- "metaTitle": titlul care apare în fila browserului și în rezultatul Google — sub 55 de caractere, conține cuvântul-cheie principal al categoriei, NU include numele site-ului (se adaugă automat separat) și NU repetă cuvânt cu cuvânt numele brut al categoriei — formulează-l ca o frază de căutare reală.
- "description": text simplu, 2 paragrafe, 120-200 cuvinte, fără headinguri/markdown/liste — se afișează ca text simplu sub produse.
- "faq": exact 4 întrebări frecvente pe care le-ar căuta cineva înainte să cumpere din această categorie, cu răspunsuri scurte (1-2 propoziții).

Trimite rezultatul apelând tool-ul \`submit_category_content\`.`;
}

// Tool forțat (tool_choice), nu text liber urmat de parsare — un JSON generat ca text de
// model poate conține ghilimele/newline-uri neescapate în interiorul string-urilor, ceea
// ce rupea `JSON.parse` naiv. Un apel de tool cu input_schema e validat de API înainte să
// ajungă la noi, deci elimină complet această clasă de eșecuri.
const CATEGORY_CONTENT_TOOL: Anthropic.Tool = {
  name: "submit_category_content",
  description: "Trimite pachetul SEO generat pentru pagina de categorie.",
  input_schema: {
    type: "object",
    properties: {
      metaTitle: {
        type: "string",
        description: "Titlu de pagină SEO, sub 55 de caractere, fără numele site-ului.",
      },
      description: { type: "string", description: "Text simplu, 2 paragrafe, 120-200 cuvinte." },
      faq: {
        type: "array",
        description: "Exact 4 întrebări frecvente.",
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            answer: { type: "string" },
          },
          required: ["question", "answer"],
        },
      },
    },
    required: ["metaTitle", "description", "faq"],
  },
};

function parseToolInput(input: unknown): GeneratedCategoryContent {
  const parsed = input as Record<string, unknown>;
  if (!parsed.metaTitle || !parsed.description) {
    throw new Error("Claude nu a returnat câmpurile așteptate (metaTitle/description)");
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

  return { metaTitle: String(parsed.metaTitle), description: String(parsed.description), faq };
}

export async function generateCategoryContent(input: CategoryContentInput): Promise<GeneratedCategoryContent> {
  const anthropic = getClient();
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1200,
    tools: [CATEGORY_CONTENT_TOOL],
    tool_choice: { type: "tool", name: "submit_category_content" },
    messages: [{ role: "user", content: buildPrompt(input) }],
  });

  const toolBlock = message.content.find((block) => block.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("Claude nu a returnat un tool_use");
  }

  return parseToolInput(toolBlock.input);
}
