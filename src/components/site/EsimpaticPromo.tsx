"use client";

import { usePathname } from "next/navigation";

/**
 * Reclama Black Friday ESIMpatic.ro (eSIM-uri, aceeași firmă), cerută de Paul pe 2026-11-02: banner mare pe prima
 * pagină, bandă subțire pe celelalte. Dispare singură după 30 noiembrie 2026. rel="sponsored": e reclamă (regula Google
 * pentru linkurile publicitare).
 */
const ENDS_AT = Date.parse("2026-12-01T00:00:00+02:00");
const HREF = "https://www.esimpatic.ro/black-friday?utm_source=farmatic&utm_medium=banner&utm_campaign=black-friday-2026";

/** Pe server și în browser dă același rezultat, cât ține campania; după 30 noiembrie, ambele ascund reclama. */
function promoActive(): boolean {
  return Date.now() < ENDS_AT;
}

export function EsimpaticPromo() {
  const pathname = usePathname();
  if (!promoActive()) return null;

  if (pathname !== "/") {
    return (
      <a
        href={HREF}
        target="_blank"
        rel="sponsored noopener"
        className="block bg-red-600 px-4 py-2 text-center text-sm text-white hover:bg-red-700"
      >
        <span className="font-semibold">Black Friday la eSIM-uri: până la −25%</span>
        <span className="hidden sm:inline"> · internet fără roaming în vacanță, pe ESIMpatic.ro</span>
        <span aria-hidden="true"> →</span>
      </a>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
      <a
        href={HREF}
        target="_blank"
        rel="sponsored noopener"
        className="group flex flex-col items-center gap-5 rounded-3xl bg-red-600 p-4 text-white shadow-lg sm:flex-row sm:gap-8 sm:p-6"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/promo/esimpatic-black-friday-640.webp"
          srcSet="/promo/esimpatic-black-friday-320.webp 320w, /promo/esimpatic-black-friday-640.webp 640w"
          sizes="(min-width: 640px) 256px, 288px"
          alt="Black Friday ESIMpatic.ro: reduceri la eSIM-uri până la 25%"
          width={640}
          height={640}
          className="w-full max-w-72 shrink-0 rounded-2xl bg-white sm:w-64"
        />
        <div className="text-center sm:text-left">
          <p className="text-xs font-bold uppercase tracking-widest text-white/80">Ofertă ESIMpatic.ro</p>
          <h2 className="mt-1 text-2xl font-extrabold leading-tight sm:text-3xl">
            Pleci în străinătate? Black Friday la eSIM-uri: până la −25%
          </h2>
          <p className="mt-3 text-white/90">
            Internet mobil fără roaming, cu codul QR pe email în câteva minute, de la un brand 100% românesc. Reducerea
            se aplică automat în coș, până pe 30 noiembrie.
          </p>
          <span className="mt-5 inline-flex rounded-full bg-white px-6 py-3 font-semibold text-red-700 group-hover:bg-red-50">
            Alege destinația →
          </span>
        </div>
      </a>
    </section>
  );
}
