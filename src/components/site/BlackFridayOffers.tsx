import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { bannerCampaigns, countdownVisible } from "@/lib/blackFriday";
import { merchantLabel } from "@/lib/productFilters";
import { BlackFridayCountdown } from "@/components/site/BlackFridayCountdown";

/**
 * Bannerul Black Friday de pe prima pagină: oferta, perioada și codul fiecărui partener (vezi lib/blackFriday), cu
 * link spre produsele lui de la noi — de acolo, click-ul trece prin /go/ cu linkul de afiliere. Apar doar magazinele
 * care au produse active; bannerul dispare singur când nu mai e nicio campanie. Cardurile au stilul timerului (roșu
 * cu alb, animate — cerut de Paul); fără animații la „prefers-reduced-motion”.
 */
const CSS = `
@keyframes bfo-in{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}
@keyframes bfo-glow{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0)}50%{box-shadow:0 0 26px 2px rgba(239,68,68,.45)}}
@keyframes bfo-shine{0%{transform:translateX(-160%) skewX(-20deg)}30%,100%{transform:translateX(420%) skewX(-20deg)}}
@keyframes bfo-pop{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
.bfo-card{animation:bfo-in .6s cubic-bezier(.2,.8,.2,1) both,bfo-glow 3s ease-in-out infinite}
.bfo-shine{animation:bfo-shine 5s ease-in-out infinite}
.bfo-pct{animation:bfo-pop 2s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.bfo-card,.bfo-shine,.bfo-pct{animation:none}.bfo-shine{display:none}}
`;

/** Cea mai mare reducere din textul ofertei („până la −98%”, „−10% la...”), ca s-o scoatem în față pe card. */
function biggestDiscount(offer: string): { value: number; upTo: boolean } | null {
  const found = [...offer.matchAll(/(până la )?−(\d+)%/gi)].map((m) => ({ value: Number(m[2]), upTo: Boolean(m[1]) }));
  return found.reduce<{ value: number; upTo: boolean } | null>((best, d) => (!best || d.value > best.value ? d : best), null);
}

export async function BlackFridayOffers() {
  const campaigns = bannerCampaigns();
  if (campaigns.length === 0) return null;

  const found = await Promise.all(
    campaigns.map((c) =>
      prisma.product.findFirst({
        where: { isActive: true, merchant: { contains: c.merchant, mode: "insensitive" } },
        select: { merchant: true },
      })
    )
  );
  const offers = campaigns.flatMap((c, i) => {
    const merchant = found[i]?.merchant;
    return merchant ? [{ ...c, href: `/produse?magazin=${encodeURIComponent(merchantLabel(merchant))}` }] : [];
  });
  if (offers.length === 0) return null;

  return (
    <section id="black-friday" className="bg-black text-white">
      <style>{CSS}</style>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold uppercase tracking-wide">
              Black <span className="text-red-500">Friday</span> la partenerii noștri
            </h2>
            <p className="mt-1 text-sm text-white/70">
              Reducerile anunțate de magazine. Condițiile complete le găsești pe site-ul fiecăruia.
            </p>
          </div>
          {countdownVisible() && <BlackFridayCountdown />}
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((o, i) => {
            const discount = biggestDiscount(o.offer);
            return (
              <div
                key={o.merchant}
                className="bfo-card group relative flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-red-700/45 to-red-950/40 p-4 ring-1 ring-red-500/50 transition-transform hover:-translate-y-1"
                style={{ animationDelay: `${i * 90}ms, ${i * 450}ms` }}
              >
                <span
                  className="bfo-shine pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/15 to-transparent"
                  style={{ animationDelay: `${i * 700}ms` }}
                  aria-hidden="true"
                />
                <div className="flex items-start justify-between gap-2">
                  <p className="text-lg font-extrabold leading-tight">{o.name}</p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      o.started ? "bg-white text-red-700" : "border border-white/80 text-white"
                    }`}
                  >
                    {o.started ? o.period : `Începe: ${o.period}`}
                  </span>
                </div>
                {discount && (
                  <div className="mt-3 flex items-center gap-2">
                    {discount.upTo && (
                      <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">până la</span>
                    )}
                    <span
                      className="bfo-pct inline-block rounded-xl bg-gradient-to-b from-red-500 to-red-700 px-3 py-1 font-mono text-3xl font-black text-white ring-1 ring-white/25"
                      style={{ animationDelay: `${i * 300}ms` }}
                    >
                      −{discount.value}%
                    </span>
                  </div>
                )}
                <p className="mt-3 text-sm text-white/90">{o.offer}</p>
                {o.code && (
                  <p className="mt-3 text-xs text-white/80">
                    Cod{" "}
                    <span className="select-all rounded-md border-2 border-dashed border-white bg-red-600 px-2 py-0.5 font-mono text-sm font-black tracking-wider text-white">
                      {o.code}
                    </span>{" "}
                    {o.codeNote}
                  </p>
                )}
                <div className="mt-auto pt-4">
                  <Link
                    href={o.href}
                    prefetch={false}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-red-700 transition-colors hover:bg-red-50"
                  >
                    Vezi produsele {o.name}
                    <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">
                      →
                    </span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
