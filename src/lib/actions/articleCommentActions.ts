"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const MAX_NAME_LENGTH = 80;
const MAX_CONTENT_LENGTH = 2000;

/** Comentarii publice la articole, trimise de vizitatori direct de pe pagina articolului — publicate imediat, fără aprobare. */
export async function submitArticleCommentAction(articleId: string, slug: string, formData: FormData) {
  // Câmp ascuns (CSS-only, invizibil pentru utilizatori reali) — dacă e completat, cererea vine de la un bot.
  if (String(formData.get("website") ?? "").trim()) return;

  const authorName = String(formData.get("authorName") ?? "").trim().slice(0, MAX_NAME_LENGTH);
  const content = String(formData.get("content") ?? "").trim().slice(0, MAX_CONTENT_LENGTH);

  if (!authorName || !content) throw new Error("Numele și textul comentariului sunt obligatorii");

  const article = await prisma.article.findUnique({ where: { id: articleId }, select: { id: true } });
  if (!article) throw new Error("Articol inexistent");

  await prisma.articleComment.create({ data: { articleId, authorName, content } });

  revalidatePath(`/blog/${slug}`);
}
