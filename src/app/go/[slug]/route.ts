import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLog";

// Redirect prin domeniul propriu spre link-ul de afiliere 2Performant,
// cu contorizare de click-uri pentru statistici în admin.
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({ where: { slug } });

  if (!product || !product.affiliateUrl) {
    return NextResponse.redirect(new URL("/produse", request.url));
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
