"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { COOKIE_CONSENT_CHANGE_EVENT, COOKIE_CONSENT_KEY } from "@/lib/cookieConsent";
import { activePartnerBanners } from "@/lib/partnerBanners";

/**
 * Fereastra de oferte din colțul din stânga jos: un carusel cu reclama Black Friday ESIMpatic.ro (aceeași firmă) și
 * bannerele 2Performant ale partenerilor din feed (lib/partnerBanners.ts), fiecare doar cât îi ține campania. Paul a
 * cerut (2026-11-05) bannerele încadrate ca reclama ESIMpatic, în fereastra cu X, nu puse direct în pagină.
 *
 * Bannerele se schimbă singure (nu cât e mouse-ul sau focusul pe fereastră, nici la „reduce motion”) și se răsfoiesc
 * cu săgețile și punctele. X-ul strânge fereastra într-o bulină, ținută minte pe toate paginile; bulina o redeschide.
 * Cât timp e afișată bara de cookie-uri, fereastra așteaptă, ca să nu stea sub ea. rel="sponsored": e reclamă.
 */

type Slide = { name: string; href: string; src: string; alt: string; width: number; height: number; rel: string };

const ESIMPATIC_ENDS_AT = Date.parse("2026-12-01T00:00:00+02:00");
const ESIMPATIC_SLIDE: Slide = {
  name: "ESIMpatic.ro",
  href: "https://www.esimpatic.ro/black-friday?utm_source=farmatic&utm_medium=banner&utm_campaign=black-friday-2026",
  src: "/promo/esimpatic-black-friday-320.webp",
  alt: "Black Friday ESIMpatic.ro: reduceri la eSIM-uri până la 25%",
  width: 320,
  height: 320,
  rel: "sponsored noopener",
};

const KEY = "oferte_carusel";
const EVENT = "oferte-carusel";
const AUTOPLAY_MS = 6000;

/** Pe server și în browser dă aceleași slide-uri; fiecare dispare la sfârșitul campaniei lui. */
function buildSlides(): Slide[] {
  const now = Date.now();
  const partners = activePartnerBanners(now).map<Slide>((b) => ({
    name: b.name,
    href: b.href,
    src: b.src,
    alt: b.name,
    width: b.width,
    height: b.height,
    rel: "sponsored nofollow noopener",
  }));
  return now < ESIMPATIC_ENDS_AT ? [ESIMPATIC_SLIDE, ...partners] : partners;
}

function subscribe(onChange: () => void): () => void {
  for (const e of ["storage", EVENT, COOKIE_CONSENT_CHANGE_EVENT]) window.addEventListener(e, onChange);
  return () => {
    for (const e of ["storage", EVENT, COOKIE_CONSENT_CHANGE_EVENT]) window.removeEventListener(e, onChange);
  };
}

type PromoState = "server" | "wait" | "min" | "open";

function promoState(): PromoState {
  try {
    // Bara de cookie-uri apare doar cu Google Analytics configurat, până la primul răspuns (vezi Analytics.tsx).
    const consent = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && consent !== "accepted" && consent !== "rejected") return "wait";
    return window.localStorage.getItem(KEY) === "min" ? "min" : "open";
  } catch {
    return "open";
  }
}

function setMinimized(value: boolean): void {
  try {
    if (value) window.localStorage.setItem(KEY, "min");
    else window.localStorage.removeItem(KEY);
  } catch {
    // fără stocare (navigare privată): fereastra revine la pagina următoare
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Imaginile se încarcă doar pentru slide-ul afișat și următorul, nu toate odată. */
function withNext(seen: Set<number>, i: number, n: number): Set<number> {
  const next = (i + 1) % n;
  return seen.has(i) && seen.has(next) ? seen : new Set(seen).add(i).add(next);
}

const ICON_CLOSE =
  "M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z";
const ICON_PREV =
  "M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z";
const ICON_NEXT =
  "M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z";

function Icon({ d, className = "h-4 w-4" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d={d} />
    </svg>
  );
}

export function PromoCarousel() {
  // Pe server nu știm dacă vizitatorul a strâns-o: apare doar în browser, după ce citim alegerea lui.
  const state = useSyncExternalStore<PromoState>(subscribe, promoState, () => "server");
  const [slides] = useState(buildSlides);
  const n = slides.length;
  const [index, setIndex] = useState(0);
  const [seen, setSeen] = useState(() => (n > 0 ? withNext(new Set<number>(), 0, n) : new Set<number>()));
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (state !== "open" || paused || n < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const next = (index + 1) % n;
    const timer = setTimeout(() => {
      setIndex(next);
      setSeen((s) => withNext(s, next, n));
    }, AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [state, paused, index, n]);

  if (state === "server" || state === "wait" || n === 0) return null;

  function show(i: number) {
    const target = (i + n) % n;
    setIndex(target);
    setSeen((s) => withNext(s, target, n));
  }

  const current = slides[index];

  return (
    <>
      <style>{`@keyframes oferte-carusel-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}`}</style>
      {state === "min" ? (
        <button
          type="button"
          onClick={() => setMinimized(false)}
          aria-label="Deschide ofertele"
          className="fixed bottom-4 left-4 z-40 flex items-center gap-1.5 rounded-full bg-red-600 py-2 pl-3 pr-2 text-xs font-bold text-white shadow-lg hover:bg-red-700"
        >
          Oferte
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] text-red-600">
            {n}
          </span>
        </button>
      ) : (
        <section
          aria-roledescription="carusel"
          aria-label="Oferte"
          className="fixed bottom-4 left-4 z-40 w-[248px] rounded-2xl border border-red-100 bg-white p-2.5 shadow-xl sm:w-[280px]"
          style={{ animation: "oferte-carusel-in .35s ease-out 2s both" }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <div className="flex items-center justify-between gap-2 pb-2 pl-1">
            <p className="truncate text-[11px] font-bold uppercase tracking-wide text-red-600">
              Publicitate · {current.name}
            </p>
            <button
              type="button"
              onClick={() => setMinimized(true)}
              aria-label="Strânge ofertele"
              className="-my-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <Icon d={ICON_CLOSE} />
            </button>
          </div>

          {/* Bannerele au forme diferite (pătrat, 300×250, 160×600, story 9:16): toate încap întregi în aceeași
              ramă, iar spațiul rămas e umplut cu bannerul însuși, estompat. */}
          <div className="relative h-[230px] overflow-hidden rounded-xl bg-gray-100 sm:h-[300px]">
            {slides.map((s, i) => (
              <a
                key={s.src}
                href={s.href}
                target="_blank"
                rel={s.rel}
                aria-hidden={i !== index}
                tabIndex={i === index ? undefined : -1}
                className={`absolute inset-0 transition-opacity duration-500 ${
                  i === index ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                {seen.has(i) && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.src}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full scale-150 object-cover opacity-90 blur-2xl"
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.src}
                      alt={s.alt}
                      title={s.name}
                      width={s.width}
                      height={s.height}
                      className="relative h-full w-full object-contain drop-shadow-md"
                    />
                  </>
                )}
              </a>
            ))}
          </div>

          {n > 1 && (
            <div className="mt-1.5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => show(index - 1)}
                aria-label="Oferta anterioară"
                className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              >
                <Icon d={ICON_PREV} className="h-5 w-5" />
              </button>
              <div className="flex items-center">
                {slides.map((s, i) => (
                  <button
                    key={s.src}
                    type="button"
                    onClick={() => show(i)}
                    aria-label={`Oferta ${i + 1} din ${n}: ${s.name}`}
                    aria-current={i === index}
                    className="flex h-7 items-center px-1"
                  >
                    <span
                      className={`block h-1.5 rounded-full transition-all ${
                        i === index ? "w-5 bg-red-600" : "w-1.5 bg-gray-300 hover:bg-gray-400"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => show(index + 1)}
                aria-label="Oferta următoare"
                className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              >
                <Icon d={ICON_NEXT} className="h-5 w-5" />
              </button>
            </div>
          )}
        </section>
      )}
    </>
  );
}
