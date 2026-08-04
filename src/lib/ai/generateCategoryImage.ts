import OpenAI from "openai";
import { promises as fs } from "fs";
import path from "path";
import { categoryImageSlug } from "@/lib/productCategory";

let client: OpenAI | null = null;
function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY nu este configurat în .env");
  }
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

function buildPrompt(categoryName: string) {
  return `Fotografie editorială, luminoasă și pozitivă, temă verde și alb, pentru un site de sănătate și naturiste, ilustrând generic categoria de produse "${categoryName}". Compoziție simplă, obiecte generice reprezentative pentru categorie, fără text, fără logo-uri, fără mărci vizibile, fără ambalaje de medicamente reale sau identificabile. Stil modern, minimalist, curat, lumină naturală caldă.`;
}

/**
 * Generează cu DALL·E 3 o singură imagine reprezentativă (ilustrativă, nu poza
 * reală a unui produs) per categorie și o salvează persistent în
 * public/uploads/categories/<slug>.png — un fișier deterministic per categorie,
 * ca o regenerare să suprascrie, nu să acumuleze fișiere noi.
 */
export async function generateCategoryImage(categoryName: string): Promise<string> {
  const openai = getClient();

  const result = await openai.images.generate({
    model: "gpt-image-1",
    prompt: buildPrompt(categoryName),
    size: "1024x1024",
    quality: "high",
    n: 1,
  });

  // Modelele GPT image (spre deosebire de dall-e-3) returnează mereu base64, nu URL.
  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error("Modelul de imagine nu a returnat nicio imagine");
  const buffer = Buffer.from(b64, "base64");

  const dir = path.join(process.cwd(), "public", "uploads", "categories");
  await fs.mkdir(dir, { recursive: true });
  const filename = `${categoryImageSlug(categoryName)}.png`;
  await fs.writeFile(path.join(dir, filename), buffer);

  return `/uploads/categories/${filename}`;
}
