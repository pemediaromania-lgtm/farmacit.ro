import { activePartnerBanners, type PartnerBanner as Banner } from "@/lib/partnerBanners";

/**
 * Lățimea afișată după forma bannerului: cele înalte (skyscraper 160×600, story 9:16) rămân înguste, ca să nu ocupe
 * un ecran întreg; pe telefon, două story-uri încap unul lângă altul.
 */
function sizeClass(b: Banner): string {
  if (b.height > b.width * 1.5) return b.width <= 160 ? "w-[160px]" : "w-[150px] sm:w-[260px]";
  return b.width <= 300 ? "w-full max-w-[300px]" : "w-full max-w-[728px]";
}

/**
 * Banner 2Performant al unui magazin partener. `<img>` simplu, nu next/image — imaginea vine de pe
 * img.2performant.com, domeniu nedeclarat în next.config.ts (la fel ca în ApilandBanner).
 */
export function PartnerBanner({ banner }: { banner: Banner }) {
  return (
    <aside aria-label={`Recomandare ${banner.name}`} className={sizeClass(banner)}>
      <p className="mb-1.5 text-[11px] uppercase tracking-wide text-brand-800/50">Publicitate · {banner.name}</p>
      {/* „sponsored” marchează linkul de afiliere pentru Google; fără „noreferrer”, ca 2Performant să vadă site-ul
          de pe care vine click-ul. */}
      <a
        href={banner.href}
        target="_blank"
        rel="sponsored nofollow noopener"
        className="block overflow-hidden rounded-lg transition-opacity hover:opacity-90"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={banner.src}
          alt={banner.name}
          title={banner.name}
          width={banner.width}
          height={banner.height}
          loading="lazy"
          className="block h-auto w-full"
        />
      </a>
    </aside>
  );
}

/** Bannerele partenerilor cu campanii în curs, pe prima pagină. Nimic, dacă nu rulează niciuna. */
export function PartnerBannersSection() {
  const banners = activePartnerBanners();
  if (banners.length === 0) return null;
  return (
    <section aria-label="Ofertele partenerilor" className="mx-auto max-w-5xl px-4 sm:px-6 pt-12">
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8">
        {banners.map((b) => (
          <PartnerBanner key={b.src} banner={b} />
        ))}
      </div>
    </section>
  );
}
