/**
 * Descarcă feed-ul 2Performant, cu reîncercări. Noaptea, cât își regenerează feed-urile, 2Performant răspunde des cu
 * 504 (casain2 a pierdut așa trei sincronizări la rând, farmatic și libratic câte două — nov. 2026), deși peste câteva
 * minute aceeași adresă merge. Reîncercăm la erorile de server/rețea: după 2, 5, 10 și 20 de minute (în total ~37 de
 * minute, în limita de 3 ore a task-ului). 404 nu se reîncearcă — feed-ul a fost șters în 2Performant.
 */
const RETRY_DELAYS_MINUTES = [2, 5, 10, 20];

export class FeedDownloadError extends Error {}

function retryable(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

export async function downloadFeedText(url: string, log: (msg: string) => void = console.log): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    let failure: string;
    let canRetry: boolean;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20 * 60_000) });
      if (response.ok) return await response.text();
      failure = `Descărcarea feed-ului a eșuat (status ${response.status})`;
      canRetry = retryable(response.status);
    } catch (error) {
      failure = `Descărcarea feed-ului a eșuat (${error instanceof Error ? error.message : String(error)})`;
      canRetry = true;
    }
    const delay = RETRY_DELAYS_MINUTES[attempt];
    if (!canRetry || delay === undefined) {
      throw new FeedDownloadError(attempt > 0 ? `${failure} — după ${attempt + 1} încercări` : failure);
    }
    log(`  ${failure}; reîncerc peste ${delay} min`);
    await new Promise((resolve) => setTimeout(resolve, delay * 60_000));
  }
}
