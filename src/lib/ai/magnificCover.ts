import Anthropic from "@anthropic-ai/sdk";
import { promises as fs } from "fs";
import path from "path";

/**
 * Coperta articolelor generată cu Magnific Mystic (același API ca pe esimpatic: header
 * x-magnific-api-key, POST /v1/ai/mystic → task, apoi GET până la COMPLETED). Fișier identic pe
 * toate site-urile de afiliere (farmatic, libratic, intimatic, jucatic, casain2); fiecare îi dă
 * stilul lui prin `CoverStyle`.
 *
 * Magnific înțelege mult mai bine o scenă descrisă în engleză decât un titlu în română, așa că
 * Claude Haiku scrie întâi o propoziție cu scena (obiecte, loc, lumină), apoi o trimitem la Mystic.
 */

export interface CoverStyle {
  /** Ce fel de site e, pentru descrierea scenei (în engleză). */
  site: string;
  /** Stilul fotografiei (în engleză): culori, lumină, compoziție. */
  look: string;
  /** Restricții în plus (în engleză), ex: „no people, nothing explicit”. */
  avoid?: string;
}

const MAGNIFIC_BASE_URL = process.env.MAGNIFIC_BASE_URL ?? "https://api.magnific.com";
const POLL_INTERVAL_MS = 5_000;
const MAX_WAIT_MS = 4 * 60 * 1000;
const NO_TEXT = "No text, no letters, no numbers, no logos, no brand names, no packaging labels, no watermark, no readable screens, no recognizable faces.";

interface MagnificTask {
  task_id: string;
  status: "CREATED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  generated?: string[] | null;
}

async function magnific(method: "GET" | "POST", route: string, body?: unknown): Promise<MagnificTask> {
  const apiKey = process.env.MAGNIFIC_API_KEY;
  if (!apiKey) throw new Error("MAGNIFIC_API_KEY nu este configurat");
  const res = await fetch(`${MAGNIFIC_BASE_URL}${route}`, {
    method,
    headers: { "x-magnific-api-key": apiKey, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Magnific HTTP ${res.status}: ${text.slice(0, 300)}`);
  const json = JSON.parse(text) as { data?: MagnificTask };
  if (!json.data?.task_id) throw new Error(`Răspuns Magnific neașteptat: ${text.slice(0, 300)}`);
  return json.data;
}

/** Scena fotografiei, în engleză, scrisă de Claude Haiku din titlul articolului. */
async function describeScene(title: string, category: string | null | undefined, style: CoverStyle): Promise<string> {
  const fallback = `A photograph illustrating a ${style.site} article about: ${title}.`;
  if (!process.env.ANTHROPIC_API_KEY) return fallback;
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: "claude-haiku-5-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Write ONE English sentence (max 35 words) describing a single concrete photographic scene that illustrates this article from a ${style.site}. Article title (Romanian): "${title}"${category ? `. Category: "${category}"` : ""}. Describe only objects, setting and light. No text, no brands, no people${style.avoid ? `; ${style.avoid}` : ""}. Reply with the sentence only.`,
        },
      ],
    });
    const sentence = message.content
      .flatMap((block) => (block.type === "text" ? [block.text] : []))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    return sentence.length > 20 ? sentence : fallback;
  } catch (error) {
    console.error("Descrierea scenei pentru copertă a eșuat:", error);
    return fallback;
  }
}

const EXTENSION_BY_TYPE: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Generează coperta cu Magnific și o salvează în public/uploads/articles. Întoarce calea publică. */
export async function generateMagnificCover(title: string, slug: string, category: string | null | undefined, style: CoverStyle): Promise<string> {
  const scene = await describeScene(title, category, style);
  let task = await magnific("POST", "/v1/ai/mystic", {
    prompt: `${scene} ${style.look} Photorealistic editorial photography. ${style.avoid ? `${style.avoid}. ` : ""}${NO_TEXT}`,
    aspect_ratio: "widescreen_16_9",
    resolution: "1k",
    model: "realism",
    engine: "automatic",
  });

  const deadline = Date.now() + MAX_WAIT_MS;
  while (task.status !== "COMPLETED") {
    if (task.status === "FAILED") throw new Error(`Magnific nu a putut genera imaginea (task ${task.task_id})`);
    if (Date.now() > deadline) throw new Error(`Magnific nu a terminat în ${MAX_WAIT_MS / 60000} minute (task ${task.task_id})`);
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    task = await magnific("GET", `/v1/ai/mystic/${encodeURIComponent(task.task_id)}`);
  }

  const url = task.generated?.[0];
  if (!url) throw new Error(`Magnific nu a întors nicio imagine (task ${task.task_id})`);
  const image = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!image.ok) throw new Error(`Descărcarea imaginii Magnific a eșuat (HTTP ${image.status})`);
  const type = (image.headers.get("content-type") ?? "").split(";")[0].trim();
  const ext = EXTENSION_BY_TYPE[type] ?? "jpg";

  const dir = path.join(process.cwd(), "public", "uploads", "articles");
  await fs.mkdir(dir, { recursive: true });
  const filename = `${slug}-${Date.now()}.${ext}`;
  await fs.writeFile(path.join(dir, filename), Buffer.from(await image.arrayBuffer()));
  return `/uploads/articles/${filename}`;
}
