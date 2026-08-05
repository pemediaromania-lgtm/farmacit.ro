"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import Script from "next/script";
import { COOKIE_CONSENT_KEY, COOKIE_CONSENT_CHANGE_EVENT } from "@/lib/cookieConsent";

type Consent = "accepted" | "rejected";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(COOKIE_CONSENT_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(COOKIE_CONSENT_CHANGE_EVENT, callback);
  };
}

function getSnapshot(): Consent | null {
  const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
  return stored === "accepted" || stored === "rejected" ? stored : null;
}

function getServerSnapshot(): Consent | null {
  return null;
}

/**
 * Google Analytics 4, condiționat de consimțământ (GDPR/ePrivacy — cookie-urile de
 * analiză nu sunt strict necesare, deci nu au voie să pornească înainte de accept
 * explicit). Nu randează nimic (nici bannerul) dacă NEXT_PUBLIC_GA_MEASUREMENT_ID
 * nu e setat — fără GA activ, nu există niciun cookie non-esențial de cerut.
 */
export function Analytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const consent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!measurementId) return null;

  function choose(value: Consent) {
    localStorage.setItem(COOKIE_CONSENT_KEY, value);
    window.dispatchEvent(new Event(COOKIE_CONSENT_CHANGE_EVENT));
  }

  return (
    <>
      {consent === "accepted" && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${measurementId}');
            `}
          </Script>
        </>
      )}

      {consent === null && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-brand-100 bg-white px-4 py-4 sm:px-6 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <p className="text-sm text-brand-900/80 text-center sm:text-left">
              Folosim cookie-uri de analiză (Google Analytics) ca să înțelegem ce conținut e util. Le pornim doar
              cu acordul tău —{" "}
              <Link href="/confidentialitate" className="underline hover:text-brand-700">
                detalii aici
              </Link>
              .
            </p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => choose("rejected")}
                className="rounded-full border border-brand-200 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                Refuz
              </button>
              <button
                type="button"
                onClick={() => choose("accepted")}
                className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
