import { prisma } from "@/lib/prisma";

export type ActivityAction =
  | "feed.created"
  | "feed.deleted"
  | "feed.imported"
  | "feed.import_failed"
  | "product.created"
  | "product.updated"
  | "article.generated"
  | "article.generation_failed"
  | "article.published"
  | "article.unpublished"
  | "product.clicked";

export async function logActivity(params: {
  action: ActivityAction;
  userId?: string | null;
  entityType?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
}) {
  await prisma.activityLog.create({
    data: {
      action: params.action,
      userId: params.userId ?? null,
      entityType: params.entityType,
      entityId: params.entityId,
      meta: params.meta ? JSON.stringify(params.meta) : null,
    },
  });
}

export function parseActivityMeta(meta: string | null): Record<string, unknown> | null {
  if (!meta) return null;
  try {
    return JSON.parse(meta) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export const ACTIVITY_LABELS: Record<ActivityAction, string> = {
  "feed.created": "Feed adăugat",
  "feed.deleted": "Feed șters",
  "feed.imported": "Feed sincronizat",
  "feed.import_failed": "Sincronizare feed eșuată",
  "product.created": "Produs nou importat",
  "product.updated": "Produs actualizat",
  "article.generated": "Articol generat automat",
  "article.generation_failed": "Generare articol eșuată",
  "article.published": "Articol publicat",
  "article.unpublished": "Articol retras din publicare",
  "product.clicked": "Click pe link afiliat",
};
