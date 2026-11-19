/**
 * Trimiterea emailurilor de alertă de preț prin Resend (același furnizor ca esimpatic), cu apel HTTP direct.
 * Pornește doar când aplicația are în Coolify:
 *   RESEND_API_KEY   — cheia din contul Resend;
 *   PRICE_ALERT_FROM — expeditorul, ex: „farmatic.ro <alerte@farmatic.ro>” (domeniul verificat în Resend).
 * Fără ele, formularul „Anunță-mă când scade prețul” nu apare deloc pe site.
 */

export function priceAlertsEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.PRICE_ALERT_FROM);
}

export async function sendEmail(message: { to: string; subject: string; html: string; text: string; unsubscribeUrl?: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.PRICE_ALERT_FROM;
  if (!apiKey || !from) throw new Error("Emailul nu e configurat (RESEND_API_KEY / PRICE_ALERT_FROM)");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
      ...(message.unsubscribeUrl && {
        headers: { "List-Unsubscribe": `<${message.unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      }),
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Resend HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
