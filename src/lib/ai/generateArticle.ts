import Anthropic from "@anthropic-ai/sdk";

export interface ArticleInput {
  name: string;
  category?: string | null;
  categoryGroup?: string | null;
  brand?: string | null;
  description?: string | null;
  price?: number | null;
  currency?: string | null;
}

export interface GeneratedFaqItem {
  question: string;
  answer: string;
}

export interface GeneratedArticle {
  title: string;
  excerpt: string;
  content: string;
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

// Model ieftin (Haiku) — articolele se generează automat, zilnic, deci costul
// per apel contează mult mai mult decât nuanța stilistică suplimentară a unui
// model mai scump precum Sonnet.
const MODEL = "claude-haiku-4-5-20251001";

function buildPrompt(product: ArticleInput) {
  const details = [
    product.brand ? `Brand: ${product.brand}` : null,
    product.category ? `Subcategorie: ${product.category}` : null,
    product.categoryGroup ? `Categorie generală: ${product.categoryGroup}` : null,
    product.price ? `Preț: ${product.price} ${product.currency ?? "RON"}` : null,
    product.description ? `Descriere originală din feed: ${product.description}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `Ești redactorul blogului farmatic.ro — un magazin afiliat românesc de produse farmaceutice, naturiste și suplimente alimentare. Scrii articole educative despre nutriție, sănătate, farmaceutice și suplimente, care se inspiră dintr-un produs real din catalog, dar tratează subiectul mai larg (nu doar produsul).

Produsul de la care pleacă articolul: "${product.name}".
${details ? `\nDetalii disponibile despre produs:\n${details}\n` : ""}
Reguli obligatorii de conținut:
- Limba română, ton cald, accesibil, de încredere — ca un prieten informat, nu ca o broșură medicală.
- Subiectul articolului trebuie să fie mai general decât produsul (ex: rolul unui nutrient, o problemă de sănătate, un obicei alimentar), folosind produsul ca exemplu concret și recomandare, NU ca unic subiect.
- NU inventa beneficii medicale nesusținute și NU afirma că vreun produs tratează/vindecă boli.
- Menționează produsul de 2-3 ori în mod natural în text, ca recomandare utilă (nu reclamă agresivă), și încheie cu un paragraf scurt de tip îndemn ("Dacă vrei să încerci [nume produs], îl găsești în magazin.").
- Încheie articolul (înainte de FAQ) cu o mențiune clară: articolul are scop informativ și nu înlocuiește sfatul unui medic sau farmacist.
- Format markdown, structurat SEO: minim 3 headinguri H2 (fiecare cu un subiect clar, folosit ca intrare de Cuprins), poți folosi și H3 sub ele. NU include un H1 (titlul e separat).
- Lungime: 450-650 cuvinte pentru "content" (fără FAQ).
- Generează și 4 întrebări frecvente (FAQ) relevante pentru subiect, cu răspunsuri scurte (1-3 propoziții), utile pentru SEO și pentru cititor.

Răspunde STRICT cu un obiect JSON valid, fără text în plus, fără code fences, cu exact cheile:
{"title": "...", "excerpt": "...", "content": "...", "faq": [{"question": "...", "answer": "..."}]}
- "title": titlu atractiv, sub 70 de caractere, care reflectă subiectul general (nu doar numele produsului).
- "excerpt": rezumat de 1-2 propoziții pentru carduri de listare.
- "content": corpul articolului în markdown (fără H1, fără secțiunea FAQ — aceea e separată în "faq").
- "faq": array cu exact 4 obiecte {"question", "answer"}.`;
}

function extractJson(text: string): GeneratedArticle {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Răspunsul Claude nu conține JSON valid");
  }
  const parsed = JSON.parse(text.slice(start, end + 1));
  if (!parsed.title || !parsed.content) {
    throw new Error("Răspunsul Claude nu are câmpurile așteptate (title/content)");
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

  return {
    title: String(parsed.title),
    excerpt: String(parsed.excerpt ?? ""),
    content: String(parsed.content),
    faq,
  };
}

export async function generateArticleContent(product: ArticleInput): Promise<GeneratedArticle> {
  const anthropic = getClient();
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1800,
    messages: [{ role: "user", content: buildPrompt(product) }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude nu a returnat conținut text");
  }

  return extractJson(textBlock.text);
}
