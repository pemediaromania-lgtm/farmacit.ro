import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLog";
import { deactivateInactiveMerchantProducts, isInactiveMerchant } from "@/lib/inactiveMerchants";
import { replacementHref } from "@/lib/replacementProduct";

// Redirect prin domeniul propriu spre link-ul de afiliere 2Performant,
// cu contorizare de click-uri pentru statistici în admin.
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({ where: { slug } });

  if (!product || !product.affiliateUrl) {
    // Relativ, nu `new URL("/produse", request.url)`: în spatele proxy-ului de pe VPS, request.url e
    // adresa internă a containerului (https://localhost:3000), iar vizitatorul ajungea acolo.
    return new NextResponse(null, { status: 307, headers: { Location: "/produse" } });
  }

  // Produs scos de pe site sau program 2Performant inactiv (vezi lib/inactiveMerchants): linkul de
  // afiliere nu mai aduce comision, iar 2Performant îl raportează ca „Bad link to inactive partner”.
  // Linkurile spre /go/ rămân totuși în articole, în Google și în istoricul browserului — vizitatorul
  // ajunge la cel mai asemănător produs activ de pe site, de unde poate cumpăra (click numărat acolo).
  const inactiveMerchant = isInactiveMerchant(product.merchant);
  if (!product.isActive || inactiveMerchant) {
    if (inactiveMerchant && product.isActive) await deactivateInactiveMerchantProducts();
    return new NextResponse(null, { status: 307, headers: { Location: await replacementHref(product) } });
  }

  await prisma.product.update({ where: { id: product.id }, data: { clickCount: { increment: 1 } } });
  await logActivity({
    action: "product.clicked",
    entityType: "product",
    entityId: product.id,
    meta: { name: product.name },
  });

  return NextResponse.redirect(product.affiliateUrl);
}
