// Banner 2Performant (728×90) — click-urile sunt contorizate de 2Performant, prin
// link-ul de tracking, nu prin /go/ (care e doar pentru produse din feed).
const APILAND_CLICK_URL =
  "https://event.2performant.com/events/click?ad_type=banner&unique=47d061d1e&aff_code=138f5b69f&campaign_unique=94d225abf";
const APILAND_BANNER_SRC =
  "https://img.2performant.com/system/paperclip/banner_pictures/pics/272713/original/272713.png";

// Bannerul anunță „până la −50%, 10–20 octombrie”: după campanie nu mai apare (și Tonic junior −30%, primit pe
// 2026-11-05, era tot pentru 10–20 octombrie). Pentru o campanie nouă Apiland: alt banner și alt termen.
const APILAND_UNTIL = "2026-10-21T00:00:00+03:00";

export function apilandBannerActive(): boolean {
  return Date.now() < Date.parse(APILAND_UNTIL);
}

export function ApilandBanner() {
  return (
    <aside aria-label="Recomandare Apiland.ro">
      <p className="mb-1.5 text-[11px] uppercase tracking-wide text-brand-800/50">
        Publicitate · Produse apicole naturale de la Apiland.ro
      </p>
      {/* „sponsored” marchează linkul de afiliere pentru Google; fără „noreferrer”, ca
          2Performant să vadă site-ul de pe care vine click-ul. */}
      <a
        href={APILAND_CLICK_URL}
        target="_blank"
        rel="sponsored nofollow noopener"
        className="block overflow-hidden rounded-lg transition-opacity hover:opacity-90"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={APILAND_BANNER_SRC}
          alt="apiland.ro"
          title="apiland.ro"
          width={728}
          height={90}
          loading="lazy"
          className="mx-auto block h-auto w-full max-w-[728px]"
        />
      </a>
    </aside>
  );
}
