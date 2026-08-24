import { prisma } from "@/lib/prisma";
import { ALL_GROUPS } from "@/lib/productCategory";

// Convenția llms.txt (llmstxt.org) — un rezumat scurt, în markdown, al site-ului,
// gândit pentru motoare AI/agenți (GEO), nu pentru crawlere clasice (acelea au
// robots.txt + sitemap.xml). Generat dinamic, ca numărul de produse per grup să
// rămână la zi, la fel ca robots.ts/sitemap.ts.
export const dynamic = "force-dynamic";

const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export async function GET() {
  const groupCounts = await prisma.product.groupBy({
    by: ["categoryGroup"],
    where: { isActive: true, categoryGroup: { not: null } },
    _count: { _all: true },
  });
  const countByGroup = new Map(groupCounts.map((g) => [g.categoryGroup, g._count._all]));

  const [totalProducts, recentArticles] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }),
    prisma.article.findMany({
      where: { status: "published" },
      orderBy: { publishedAt: "desc" },
      take: 10,
      select: { title: true, slug: true, excerpt: true },
    }),
  ]);

  const groupLines = ALL_GROUPS.filter((g) => g !== "Diverse")
    .map((group) => {
      const count = countByGroup.get(group) ?? 0;
      return `- [${group}](${baseUrl}/produse?grup=${encodeURIComponent(group)}): ${count} produse`;
    })
    .join("\n");

  const articleLines = recentArticles
    .map((a) => `- [${a.title}](${baseUrl}/blog/${a.slug})${a.excerpt ? `: ${a.excerpt}` : ""}`)
    .join("\n");

  const body = `# Farmatic.ro

> Farmatic.ro este un magazin afiliat românesc de produse farmaceutice, naturiste și suplimente alimentare — catalog agregat de la farmacii și magazine partenere de încredere, cu ${totalProducts} produse active, plus articole educative despre sănătate și naturețe. Conținut clar, pozitiv, fără afirmații medicale nesusținute.

## Categorii de produse
${groupLines}

## Blog (articole recente)
${articleLines || "- Niciun articol publicat încă."}

## Resurse
- [Toate produsele](${baseUrl}/produse)
- [Tot blogul](${baseUrl}/blog)
- [Despre Farmatic.ro](${baseUrl}/despre)
- [Contact](${baseUrl}/contact)
- [Sitemap complet (XML, toate paginile individuale)](${baseUrl}/sitemap.xml)

## Note
- Fiecare produs are propria pagină (/produse/[slug]) cu preț, brand, descriere și, pentru multe, un FAQ dedicat — vezi sitemap.xml pentru lista completă, nu sunt enumerate aici din cauza volumului.
- Paginile /admin, /api și /go (redirect de afiliere) sunt excluse din indexare — vezi /robots.txt.
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
