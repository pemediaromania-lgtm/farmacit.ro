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

  // "Complet" = are deja metaTitle — rândurile create înainte de adăugarea acestui
  // câmp au description+faq dar metaTitle null, deci trebuie completate (upsert),
  // nu doar cele complet lipsă (create). Idempotent și resumabil: o rulare
  // întreruptă (ex. la o eroare tranzitorie de capacitate Anthropic) poate fi
  // repornită oricând, reia doar ce a rămas incomplet.
  const existing = await prisma.categoryContent.findMany({
    select: { categoryGroup: true, category: true, metaTitle: true },
  });
  const completeKeys = new Set(
    existing.filter((e) => e.metaTitle).map((e) => `${e.categoryGroup}::${e.category}`)
  );

  const pending = targets.filter((t) => !completeKeys.has(`${t.categoryGroup}::${t.category}`));

  let succeeded = 0;
  let failed = 0;

  for (const target of pending) {
    try {
      const generated = await generateCategoryContent({
        categoryGroup: target.categoryGroup,
        category: target.category || null,
      });

      await prisma.categoryContent.upsert({
        where: { categoryGroup_category: { categoryGroup: target.categoryGroup, category: target.category } },
        create: {
          categoryGroup: target.categoryGroup,
          category: target.category,
          metaTitle: generated.metaTitle,
          description: generated.description,
          faq: JSON.stringify(generated.faq),
        },
        update: {
          metaTitle: generated.metaTitle,
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
    meta: { attempted: pending.length, succeeded, failed },
  });

  return { attempted: pending.length, succeeded, failed };
}
