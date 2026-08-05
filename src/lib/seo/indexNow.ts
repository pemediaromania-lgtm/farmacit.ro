// IndexNow: anunță Bing/Yandex (și alți participanți) instant când o pagină e nouă/actualizată,
// în loc să aștepte următorul crawl programat. Cheia trebuie să fie identică cu fișierul
// public/<key>.txt, servit static la https://<domeniu>/<key>.txt.
const INDEXNOW_KEY = "24a5dbda403a44b1ade676acea2fc65c";
const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

function isPubliclyReachable(): boolean {
  try {
    const { hostname } = new URL(baseUrl);
    return hostname !== "localhost" && hostname !== "127.0.0.1";
  } catch {
    return false;
  }
}

/**
 * Trimite URL-uri către IndexNow (best-effort — nu aruncă eroare dacă serviciul e
 * indisponibil, ca să nu blocheze niciodată fluxul principal — publicare articol,
 * import feed etc.). Fără efect în dev local (NEXTAUTH_URL=localhost).
 */
export async function submitUrlsToIndexNow(urls: string[]): Promise<void> {
  if (urls.length === 0 || !isPubliclyReachable()) return;

  const host = new URL(baseUrl).host;
  const keyLocation = `${baseUrl}/${INDEXNOW_KEY}.txt`;
  const CHUNK_SIZE = 10000; // limita per request a protocolului IndexNow

  for (let i = 0; i < urls.length; i += CHUNK_SIZE) {
    const urlList = urls.slice(i, i + CHUNK_SIZE);
    try {
      await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ host, key: INDEXNOW_KEY, keyLocation, urlList }),
      });
    } catch {
      // ping eșuat — nu e critic, motoarele vor găsi paginile oricum prin sitemap/crawl normal
    }
  }
}

export function submitUrlToIndexNow(url: string): Promise<void> {
  return submitUrlsToIndexNow([url]);
}
