import OpenAI from "openai";
import { promises as fs } from "fs";
import path from "path";
import { generateMagnificCover, type CoverStyle } from "@/lib/ai/magnificCover";

// Stilul copertelor generate cu Magnific (vezi magnificCover.ts).
const COVER_STYLE: CoverStyle = {
  site: "Romanian health, natural remedies and personal care blog",
  look: "Bright, clean, minimalist still life, green and white tones, warm natural light.",
  avoid: "no people, no medicine packaging, nothing clinical or frightening"
};

let client: OpenAI | null = null;
function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY nu este configurat în .env");
  }
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

function buildPrompt(title: string, category?: string | null) {
  return `Fotografie editorială luminoasă și pozitivă pentru un blog de sănătate și produse naturiste cu temă verde și alb, ilustrând subiectul: "${title}"${
    category ? ` (categorie: ${category})` : ""
  }. Stil modern, curat, minimalist, culori dominante verde și alb, lumină naturală caldă, fără text, fără logo-uri, fără ambalaje de medicamente reale sau mărci vizibile, fără conținut înfricoșător sau clinic-steril.`;
}

/** Generează o imagine de copertă cu DALL·E 3 și o salvează persistent în public/uploads/articles. */
export async function generateCoverImage(title: string, slug: string, category?: string | null): Promise<string> {
  // Din 2026-11-17 coperțile se fac cu Magnific; OpenAI rămâne rezervă (cheie lipsă sau eroare Magnific).
  if (process.env.MAGNIFIC_API_KEY) {
    try {
      return await generateMagnificCover(title, slug, category, COVER_STYLE);
    } catch (error) {
      console.error("Coperta cu Magnific a eșuat, încerc cu OpenAI:", error);
    }
  }

  const openai = getClient();

  // "medium" (nu "high") — coperțile de articol sunt ilustrative, nu au nevoie
  // de rezoluție maximă, iar calitatea "high" costă semnificativ mai mult per imagine.
  const result = await openai.images.generate({
    model: "gpt-image-1",
    prompt: buildPrompt(title, category),
    size: "1024x1024",
    quality: "medium",
    n: 1,
  });

  // Modelele GPT image (spre deosebire de dall-e-3, retras) returnează mereu base64, nu URL.
  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error("Modelul de imagine nu a returnat nicio imagine");
  const buffer = Buffer.from(b64, "base64");

  const dir = path.join(process.cwd(), "public", "uploads", "articles");
  await fs.mkdir(dir, { recursive: true });
  const filename = `${slug}-${Date.now()}.png`;
  await fs.writeFile(path.join(dir, filename), buffer);

  return `/uploads/articles/${filename}`;
}
