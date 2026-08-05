export const COOKIE_CONSENT_KEY = "farmatic-cookie-consent";

// Event de sincronizare în cadrul aceleiași file (localStorage nu declanșează
// "storage" pe fila care l-a scris, doar pe altele) — Analytics ascultă asta ca
// să reacționeze imediat când CookiePreferencesButton resetează alegerea.
export const COOKIE_CONSENT_CHANGE_EVENT = "farmatic-cookie-consent-change";
