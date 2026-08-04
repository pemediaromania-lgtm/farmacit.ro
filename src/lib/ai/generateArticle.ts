import Anthropic from "@anthropic-ai/sdk";

export interface ArticleInput {
  name: string;
  category?: string | null;
  brand?: string | null;
  description?: string | null;
  price?: number | null;
  currency?: string | null;
}

export interface GeneratedArticle {
  title: string;
  excerpt: string;
  content: string;
}

let client: Anthropic | null = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY nu este configurat în .env");
  }
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

function buildPrompt(product: ArticleInput) {
  const details = [
    product.brand ? `Brand: ${product.brand}` : null,
    product.category ? `Categorie: ${product.category}` : null,
    product.price ? `Preț: ${product.price} ${product.currency ?? "RON"}` : null,
    product.description ? `Descriere originală din feed: ${product.description}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `Ești redactorul blogului farmatic.ro — un site românesc despre produse farmaceutice și naturiste, cu ton pozitiv, cald, prietenos și demn de încredere.

Scrie un articol de blog despre produsul: "${product.name}".
${details ? `\nDetalii disponibile:\n${details}\n` : ""}
Reguli obligatorii:
- Limba română, ton pozitiv și accesibil, dar informativ.
- NU inventa beneficii medicale nesusținute și NU afirma că produsul tratează/vindecă boli.
- Încheie articolul cu o mențiune clară: articolul are scop informativ și nu înlocuiește sfatul unui medic sau farmacist.
- Format markdown, cu un H2 pentru context/beneficii generale ale categoriei de produs și un H3 cu "Pentru cine este recomandat" (formulat general, nu ca sfat medical).
- Lungime: 350-550 cuvinte.

Răspunde STRICT cu un obiect JSON valid, fără text în plus, fără code fences, cu exact cheile:
{"title": "...", "excerpt": "...", "content": "..."}
- "title": titlu atractiv, sub 70 de caractere.
- "excerpt": rezumat de 1-2 propoziții pentru carduri de listare.
- "content": corpul articolului în markdown (fără a repeta titlul ca H1).`;
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
  return {
    title: String(parsed.title),
    excerpt: String(parsed.excerpt ?? ""),
    content: String(parsed.content),
  };
}

export async function generateArticleContent(product: ArticleInput): Promise<GeneratedArticle> {
  const anthropic = getClient();
  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 2048,
    messages: [{ role: "user", content: buildPrompt(product) }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude nu a returnat conținut text");
  }

  return extractJson(textBlock.text);
}
