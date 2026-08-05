"use client";

import { COOKIE_CONSENT_KEY, COOKIE_CONSENT_CHANGE_EVENT } from "@/lib/cookieConsent";

/** Șterge alegerea salvată despre cookie-uri, ca bannerul de consimțământ să reapară. */
export function CookiePreferencesButton() {
  return (
    <button
      type="button"
      onClick={() => {
        localStorage.removeItem(COOKIE_CONSENT_KEY);
        window.dispatchEvent(new Event(COOKIE_CONSENT_CHANGE_EVENT));
      }}
      className="text-brand-600 underline hover:text-brand-800"
    >
      schimbă alegerea despre cookie-uri
    </button>
  );
}
