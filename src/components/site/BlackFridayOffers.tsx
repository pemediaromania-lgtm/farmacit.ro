import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { bannerCampaigns } from "@/lib/blackFriday";
import { merchantLabel } from "@/lib/productFilters";

/**
 * Bannerul Black Friday de pe prima pagină: oferta, perioada și codul fiecărui partener (vezi lib/blackFriday), cu
 * link spre produsele lui de la noi — de acolo, click-ul trece prin /go/ cu linkul de afiliere. Apar doar magazinele
 * care au produse active; bannerul dispare singur când nu mai e nicio campanie.
 */
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
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
        <h2 className="text-2xl font-extrabold uppercase tracking-wide">
          Black <span className="text-amber-400">Friday</span> la partenerii noștri
        </h2>
        <p className="mt-1 text-sm text-white/70">
          Reducerile anunțate de magazine. Condițiile complete le găsești pe site-ul fiecăruia.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((o) => (
            <div key={o.merchant} className="flex flex-col rounded-2xl border border-white/15 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold">{o.name}</p>
                <span className="shrink-0 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-black">
                  {o.started ? o.period : `Începe: ${o.period}`}
                </span>
              </div>
              <p className="mt-2 text-sm text-white/85">{o.offer}</p>
              {o.code && (
                <p className="mt-3 text-xs text-white/70">
                  Cod{" "}
                  <span className="select-all rounded border border-dashed border-amber-400 px-1.5 py-0.5 font-mono text-sm font-bold text-amber-300">
                    {o.code}
                  </span>{" "}
                  {o.codeNote}
                </p>
              )}
              <Link
                href={o.href}
                prefetch={false}
                className="mt-auto pt-4 text-sm font-semibold text-amber-400 hover:text-amber-300 hover:underline"
              >
                Vezi produsele {o.name} →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
