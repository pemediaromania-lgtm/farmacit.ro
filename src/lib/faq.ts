export interface FaqItem {
  question: string;
  answer: string;
}

/** Parsează un JSON de FAQ (stocat ca `String?` în Prisma) — folosit atât pentru articole, cât și pentru pagini de categorie. */
export function parseFaqJson(faqJson: string | null): FaqItem[] {
  if (!faqJson) return [];
  try {
    const items = JSON.parse(faqJson);
    if (!Array.isArray(items)) return [];
    return items
      .map((item) => ({ question: String(item.question ?? ""), answer: String(item.answer ?? "") }))
      .filter((item) => item.question && item.answer);
  } catch {
    return [];
  }
}
