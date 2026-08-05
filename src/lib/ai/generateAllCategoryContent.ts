import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLog";
import { generateCategoryContent } from "@/lib/ai/generateCategoryContent";
import { ALL_GROUPS, ALL_SUBCATEGORIES } from "@/lib/productCategory";

const FALLBACK = "Diverse"; // fără temă coerentă de cuvinte-cheie — nu generăm conținut SEO pentru el

/**
 * Generează (Claude, o singură dată per categorie/subcategorie) textul SEO + FAQ
 * pentru toate paginile de categorie care încă nu au unul — apelată din admin,
 * rulează secvențial (fiecare apel costă bani, deci nu în paralel/burst).
 */
export async function generateAllCategoryContent(userId?: string | null) {
  const targets: { categoryGroup: string; category: string }[] = [
    ...ALL_GROUPS.filter((group) => group !== FALLBACK).map((group) => ({ categoryGroup: group, category: "" })),
    ...ALL_SUBCATEGORIES.map((sub) => ({ categoryGroup: sub.group, category: sub.name })),
  ];

  const existing = await prisma.categoryContent.findMany({ select: { categoryGroup: true, category: true } });
  const existingKeys = new Set(existing.map((e) => `${e.categoryGroup}::${e.category}`));

  let succeeded = 0;
  let failed = 0;

  for (const target of targets) {
    const key = `${target.categoryGroup}::${target.category}`;
    if (existingKeys.has(key)) continue;

    try {
      const generated = await generateCategoryContent({
        categoryGroup: target.categoryGroup,
        category: target.category || null,
      });

      await prisma.categoryContent.create({
        data: {
          categoryGroup: target.categoryGroup,
          category: target.category,
          description: generated.description,
          faq: JSON.stringify(generated.faq),
        },
      });
      succeeded++;
    } catch (error) {
      failed++;
      await logActivity({
        action: "category_content.generation_failed",
        userId,
        entityType: "category",
        meta: { ...target, error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  await logActivity({
    action: "category_content.generated",
    userId,
    meta: { attempted: targets.length - existingKeys.size, succeeded, failed },
  });

  return { attempted: targets.length - existingKeys.size, succeeded, failed };
}
