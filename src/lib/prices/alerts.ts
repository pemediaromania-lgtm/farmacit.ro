import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { escapeHtml, priceAlertsEnabled, sendEmail } from "@/lib/prices/email";
import { formatPrice } from "@/lib/prices/format";

/**
 * Alertele „Anunță-mă când scade prețul”. Vizitatorul lasă emailul (cu acord explicit), primește un email de confirmare
 * (ca nimeni să nu poată abona adresa altcuiva), iar după confirmare îi scriem O SINGURĂ DATĂ, când prețul scade sub cel
 * de la abonare (cu cel puțin 1%). Fiecare email are link de dezabonare. Verificarea rulează după fiecare sincronizare.
 */

const baseUrl = () => process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const siteName = () => baseUrl().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");

/** Cel mult atâtea emailuri de alertă la o sincronizare (planul gratuit Resend: 100 pe zi). */
const MAX_ALERTS_PER_RUN = 90;

function layout(title: string, body: string, unsubscribeUrl?: string): string {
  return `<!doctype html><html lang="ro"><body style="margin:0;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;color:#1c1917">
<div style="max-width:560px;margin:0 auto;padding:24px">
<p style="margin:0 0 16px;font-size:14px;color:#57534e">${escapeHtml(siteName())}</p>
<div style="background:#ffffff;border-radius:12px;padding:24px">
<h1 style="margin:0 0 12px;font-size:20px;line-height:1.3">${escapeHtml(title)}</h1>
${body}
</div>
${unsubscribeUrl ? `<p style="margin:16px 0 0;font-size:12px;color:#78716c">Ai primit emailul pentru că ai cerut o alertă de preț pe ${escapeHtml(siteName())}. <a href="${unsubscribeUrl}" style="color:#57534e">Dezabonează-te</a></p>` : ""}
</div></body></html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:20px 0 0"><a href="${href}" style="display:inline-block;background:#1c1917;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px">${escapeHtml(label)}</a></p>`;
}

export type SubscribeResult = "sent" | "already-active" | "disabled" | "invalid";

export async function subscribeToPriceAlert(productId: string, rawEmail: string): Promise<SubscribeResult> {
  if (!priceAlertsEnabled()) return "disabled";
  const email = rawEmail.trim().toLowerCase();
  if (!/^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i.test(email)) return "invalid";
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, name: true, slug: true, price: true, isActive: true } });
  if (!product?.isActive || product.price == null) return "invalid";

  const existing = await prisma.priceAlert.findUnique({ where: { productId_email: { productId, email } } });
  if (existing?.confirmedAt && !existing.unsubscribedAt && !existing.notifiedAt) return "already-active";

  const token = randomBytes(24).toString("base64url");
  await prisma.priceAlert.upsert({
    where: { productId_email: { productId, email } },
    create: { productId, email, priceAtSignup: product.price, token },
    update: { priceAtSignup: product.price, token, confirmedAt: null, notifiedAt: null, unsubscribedAt: null },
  });

  const confirmUrl = `${baseUrl()}/alerta-pret/confirmare?token=${token}`;
  await sendEmail({
    to: email,
    subject: `Confirmă alerta de preț: ${product.name.slice(0, 80)}`,
    text: `Ai cerut să te anunțăm când scade prețul produsului „${product.name}” (acum ${formatPrice(product.price)}).\nConfirmă alerta: ${confirmUrl}\nDacă n-ai cerut tu, ignoră emailul — nu te vom mai contacta.`,
    html: layout(
      "Confirmă alerta de preț",
      `<p style="margin:0;font-size:15px;line-height:1.5">Ai cerut să te anunțăm când scade prețul produsului <strong>${escapeHtml(product.name)}</strong> (acum ${escapeHtml(formatPrice(product.price))}).</p>${button(confirmUrl, "Confirmă alerta")}<p style="margin:16px 0 0;font-size:13px;color:#57534e">Dacă n-ai cerut tu, ignoră emailul — nu te vom mai contacta.</p>`
    ),
  });
  return "sent";
}

export async function confirmPriceAlert(token: string) {
  const alert = await prisma.priceAlert.findUnique({ where: { token }, include: { product: { select: { name: true, slug: true } } } });
  if (!alert) return null;
  if (!alert.confirmedAt || alert.unsubscribedAt) {
    await prisma.priceAlert.update({ where: { id: alert.id }, data: { confirmedAt: new Date(), unsubscribedAt: null } });
  }
  return alert;
}

export async function unsubscribePriceAlert(token: string) {
  const alert = await prisma.priceAlert.findUnique({ where: { token }, include: { product: { select: { name: true, slug: true } } } });
  if (!alert) return null;
  if (!alert.unsubscribedAt) await prisma.priceAlert.update({ where: { id: alert.id }, data: { unsubscribedAt: new Date() } });
  return alert;
}

/** După sincronizare: trimite alertele confirmate al căror produs s-a ieftinit. Întoarce câte s-au trimis. */
export async function processPriceAlerts(): Promise<{ sent: number; failed: number }> {
  if (!priceAlertsEnabled()) return { sent: 0, failed: 0 };
  const due = await prisma.$queryRaw<{ id: string; email: string; token: string; priceAtSignup: number; name: string; slug: string; price: number }[]>`
    SELECT a."id", a."email", a."token", a."priceAtSignup", p."name", p."slug", p."price"
    FROM "PriceAlert" a JOIN "Product" p ON p."id" = a."productId"
    WHERE a."confirmedAt" IS NOT NULL AND a."unsubscribedAt" IS NULL AND a."notifiedAt" IS NULL
      AND p."isActive" AND p."price" IS NOT NULL AND p."price" <= a."priceAtSignup" * 0.99
    ORDER BY (a."priceAtSignup" - p."price") / a."priceAtSignup" DESC
    LIMIT ${MAX_ALERTS_PER_RUN}`;

  let sent = 0;
  let failed = 0;
  for (const alert of due) {
    const productUrl = `${baseUrl()}/produse/${alert.slug}?sursa=alerta`;
    const unsubscribeUrl = `${baseUrl()}/alerta-pret/dezabonare?token=${alert.token}`;
    // Antetul List-Unsubscribe: Gmail/Yahoo trimit POST „one-click” — ruta API îl primește.
    const oneClickUrl = `${baseUrl()}/api/alerta-pret/dezabonare?token=${alert.token}`;
    const drop = Math.round((1 - alert.price / alert.priceAtSignup) * 100);
    try {
      await sendEmail({
        to: alert.email,
        unsubscribeUrl: oneClickUrl,
        subject: `A scăzut prețul cu ${drop}%: ${alert.name.slice(0, 70)}`,
        text: `Prețul produsului „${alert.name}” a scăzut de la ${formatPrice(alert.priceAtSignup)} la ${formatPrice(alert.price)}.\nVezi oferta: ${productUrl}\n\nAlerta s-a încheiat; o poți reactiva de pe pagina produsului.\nDezabonare: ${unsubscribeUrl}`,
        html: layout(
          `A scăzut prețul cu ${drop}%`,
          `<p style="margin:0;font-size:15px;line-height:1.5"><strong>${escapeHtml(alert.name)}</strong></p><p style="margin:10px 0 0;font-size:15px">De la <s>${escapeHtml(formatPrice(alert.priceAtSignup))}</s> la <strong style="font-size:18px">${escapeHtml(formatPrice(alert.price))}</strong></p>${button(productUrl, "Vezi oferta")}<p style="margin:16px 0 0;font-size:13px;color:#57534e">Prețul îl stabilește magazinul și se poate schimba oricând. Alerta s-a încheiat; o poți reactiva de pe pagina produsului.</p>`,
          unsubscribeUrl
        ),
      });
      await prisma.priceAlert.update({ where: { id: alert.id }, data: { notifiedAt: new Date() } });
      sent++;
    } catch (error) {
      console.error("Alerta de preț nu s-a putut trimite:", error);
      failed++;
    }
  }
  return { sent, failed };
}
