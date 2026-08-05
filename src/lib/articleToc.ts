import { baseSlug } from "@/lib/slug";

export interface TocEntry {
  id: string;
  text: string;
  level: 2 | 3;
}

/** Extrage un Cuprins din headingurile H2/H3 ale conținutului markdown al unui articol. */
export function extractToc(markdown: string): TocEntry[] {
  const lines = markdown.split("\n");
  const seen = new Set<string>();
  const entries: TocEntry[] = [];

  for (const line of lines) {
    const match = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;
    const level = match[1].length as 2 | 3;
    const text = match[2].replace(/[*_`]/g, "").trim();
    if (!text) continue;

    let id = baseSlug(text);
    let candidate = id;
    let i = 2;
    while (seen.has(candidate)) candidate = `${id}-${i++}`;
    seen.add(candidate);
    id = candidate;

    entries.push({ id, text, level });
  }

  return entries;
}
