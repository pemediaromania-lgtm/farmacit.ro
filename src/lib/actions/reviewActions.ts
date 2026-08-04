"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const MAX_NAME_LENGTH = 80;
const MAX_CONTENT_LENGTH = 2000;

/** Recenzii publice, trimise de vizitatori direct de pe pagina produsului — publicate imediat, fără aprobare. */
export async function submitReviewAction(productId: string, slug: string, formData: FormData) {
  // Câmp ascuns (CSS-only, invizibil pentru utilizatori reali) — dacă e completat, cererea vine de la un bot.
  if (String(formData.get("website") ?? "").trim()) return;

  const authorName = String(formData.get("authorName") ?? "").trim().slice(0, MAX_NAME_LENGTH);
  const content = String(formData.get("content") ?? "").trim().slice(0, MAX_CONTENT_LENGTH);
  const rating = Number(formData.get("rating"));

  if (!authorName || !content) throw new Error("Numele și textul recenziei sunt obligatorii");
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error("Rating invalid");

  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) throw new Error("Produs inexistent");

  await prisma.review.create({ data: { productId, authorName, rating, content } });

  revalidatePath(`/produse/${slug}`);
}
