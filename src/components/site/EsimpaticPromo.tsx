"use client";

import { useSyncExternalStore } from "react";

/**
 * Reclama Black Friday ESIMpatic.ro (eSIM-uri, aceeași firmă): un card mic, plutitor, în colțul din stânga jos. X-ul îl
 * strânge într-o bulină, ținută minte pe toate paginile; bulina îl deschide la loc. Paul a vrut-o discretă (2026-11-02),
 * nu banner mare. Dispare singură după 30 noiembrie 2026. rel="sponsored": e reclamă (regula Google pentru linkurile
 * publicitare).
 */
const ENDS_AT = Date.parse("2026-12-01T00:00:00+02:00");
const HREF = "https://www.esimpatic.ro/black-friday?utm_source=farmatic&utm_medium=banner&utm_campaign=black-friday-2026";
const KEY = "esimpatic_promo_bf2026";
const EVENT = "esimpatic-promo";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

type PromoState = "min" | "open" | "server";

function promoState(): PromoState {
  try {
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
    // fără stocare (navigare privată): cardul revine la pagina următoare
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Pe server și în browser dă același rezultat, cât ține campania; după 30 noiembrie, ambele ascund reclama. */
function promoActive(): boolean {
  return Date.now() < ENDS_AT;
}

export function EsimpaticPromo() {
  // Pe server nu știm dacă vizitatorul a strâns-o: apare doar în browser, după ce citim alegerea lui.
  const state = useSyncExternalStore<PromoState>(subscribe, promoState, () => "server");
  if (!promoActive() || state === "server") return null;

  return (
    <>
      <style>{`@keyframes esimpatic-promo-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}`}</style>
      {state === "min" ? (
        <button
          type="button"
          onClick={() => setMinimized(false)}
          aria-label="Deschide oferta Black Friday ESIMpatic"
          className="fixed bottom-4 left-4 z-40 flex items-center gap-1.5 rounded-full bg-red-600 py-2 pl-2 pr-3 text-xs font-bold text-white shadow-lg hover:bg-red-700"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/promo/esimpatic-black-friday-320.webp" alt="" width={24} height={24} className="h-6 w-6 rounded-full bg-white" />
          eSIM −25%
        </button>
      ) : (
        <div
          className="fixed bottom-4 left-4 right-4 z-40 sm:right-auto sm:w-80"
          style={{ animation: "esimpatic-promo-in .35s ease-out 2s both" }}
        >
          <a
            href={HREF}
            target="_blank"
            rel="sponsored noopener"
            className="flex items-center gap-3 rounded-2xl border border-red-100 bg-white p-2.5 pr-9 shadow-xl hover:border-red-300"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/promo/esimpatic-black-friday-320.webp"
              alt="Black Friday ESIMpatic.ro: reduceri la eSIM-uri până la 25%"
              width={64}
              height={64}
              className="h-16 w-16 shrink-0 rounded-xl"
            />
            <span className="min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-red-600">Black Friday · ESIMpatic.ro</span>
              <span className="block text-sm font-bold leading-snug text-gray-900">eSIM-uri pentru vacanță, până la −25%</span>
              <span className="block text-xs text-gray-600">Internet fără roaming · până pe 30 nov. →</span>
            </span>
          </a>
          <button
            type="button"
            onClick={() => setMinimized(true)}
            aria-label="Strânge oferta"
            className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}
