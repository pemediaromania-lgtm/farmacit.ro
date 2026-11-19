import { getPriceHistory, type PriceHistoryView } from "@/lib/prices/history";
import { getPriceComparison, type PriceComparison } from "@/lib/prices/compare";
import { priceAlertsEnabled } from "@/lib/prices/email";
import { formatDay, formatPrice, storeName } from "@/lib/prices/format";
import { PriceChart } from "@/components/prices/PriceChart";
import { PriceAlertForm } from "@/components/prices/PriceAlertForm";

/**
 * Pe pagina produsului (toate site-urile de afiliere): comparația de preț cu alți parteneri 2Performant și istoricul
 * prețului, cu alerta „Anunță-mă când scade prețul”. Componentă identică pe toate site-urile; fiecare îi dă stilul
 * titlurilor și culoarea liniei din grafic.
 */

interface Props {
  product: {
    id: string;
    slug: string;
    name: string;
    price: number | null;
    oldPrice: number | null;
    currency: string | null;
    merchant: string | null;
    category: string | null;
    brand: string | null;
    gtin: string | null;
    isActive: boolean;
  };
  headingClassName?: string;
  lineColor?: string;
}

/** O eroare aici (ex: tabelele încă necreate) nu are voie să strice pagina produsului. */
async function safe<T>(promise: Promise<T>, label: string): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    console.error(`[prețuri] ${label}:`, error);
    return null;
  }
}

const buyClass =
  "inline-flex items-center justify-center whitespace-nowrap rounded-full border-2 border-stone-900 px-4 py-1.5 text-sm font-semibold text-stone-900 hover:bg-stone-900 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900";

export async function ProductPrices({ product, headingClassName = "text-xl font-bold text-stone-900", lineColor }: Props) {
  if (!product.isActive || product.price == null) return null;
  const [history, comparison] = await Promise.all([
    safe(getPriceHistory(product.id, product.price), "istoric"),
    safe(getPriceComparison(product), "comparație"),
  ]);
  const alerts = priceAlertsEnabled();

  return (
    <>
      {comparison && <Comparison product={product} data={comparison} headingClassName={headingClassName} />}
      {(history || alerts) && (
        <section className="mt-10" aria-labelledby="istoric-pret">
          <h2 id="istoric-pret" className={headingClassName}>
            Istoricul prețului
          </h2>
          {history ? <History history={history} currency={product.currency} lineColor={lineColor} /> : null}
          {alerts && (
            <div className="mt-4 max-w-xl">
              <PriceAlertForm productId={product.id} />
            </div>
          )}
        </section>
      )}
    </>
  );
}

function Comparison({ product, data, headingClassName }: { product: Props["product"]; data: PriceComparison; headingClassName: string }) {
  if (data.same.length > 0) {
    const rows = [
      { slug: product.slug, store: storeName(product.merchant), price: product.price!, oldPrice: product.oldPrice, current: true },
      ...data.same.map((o) => ({ slug: o.slug, store: o.store, price: o.price, oldPrice: o.oldPrice, current: false, match: o.match })),
    ].sort((a, b) => a.price - b.price);
    const cheapest = rows[0].price;
    const saving = Math.max(...rows.map((r) => r.price)) - cheapest;
    const byNameOnly = data.same.some((o) => o.match !== "ean");
    return (
      <section className="mt-10" aria-labelledby="compara-pret">
        <h2 id="compara-pret" className={headingClassName}>
          Compară prețul la {rows.length} magazine
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          {byNameOnly
            ? "Același nume de produs, la magazinele partenere; verifică ediția sau varianta pe site-ul magazinului."
            : "Același produs (același cod EAN), la magazinele partenere."}
          {saving >= 1 ? ` Diferența dintre cel mai mic și cel mai mare preț: ${formatPrice(saving, product.currency)}.` : ""}
        </p>
        <ul className="mt-4 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
          {rows.map((r) => (
            <li key={r.slug} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-stone-900">{r.store}</p>
                <p className="text-xs text-stone-600">
                  {"current" in r && r.current ? "Produsul de pe această pagină" : "match" in r && r.match === "ean" ? "Același produs (același cod EAN)" : "Același nume de produs"}
                  {Math.abs(r.price - cheapest) < 0.005 && <span className="ml-2 rounded-full bg-stone-900 px-2 py-0.5 font-semibold text-white">Cel mai mic preț</span>}
                </p>
              </div>
              <p className="text-right">
                <span className="text-lg font-bold text-stone-900">{formatPrice(r.price, product.currency)}</span>
                {r.oldPrice != null && r.oldPrice > r.price && <span className="ml-2 text-sm text-stone-500 line-through">{formatPrice(r.oldPrice, product.currency)}</span>}
              </p>
              {/* <a> simplu, nu <Link>: Link ar preîncărca /go/ (care numără click-ul). */}
              <a href={`/go/${r.slug}?sursa=comparatie`} rel="sponsored nofollow" className={buyClass}>
                Vezi oferta
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-stone-500">Prețurile vin de la magazine prin 2Performant și se actualizează zilnic; verifică prețul final pe site-ul magazinului.</p>
      </section>
    );
  }

  if (data.similar.length === 0) return null;
  return (
    <section className="mt-10" aria-labelledby="compara-pret">
      <h2 id="compara-pret" className={headingClassName}>
        Asemănătoare, la alte magazine
      </h2>
      <p className="mt-1 text-sm text-stone-600">Nu am găsit exact acest produs la alt partener; acestea sunt cele mai apropiate.</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {data.similar.map((o) => (
          <li key={o.slug} className="flex gap-3 rounded-2xl border border-stone-200 bg-white p-3">
            {o.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- poze de pe site-urile magazinelor, dimensiuni mici
              <img src={o.imageUrl} alt="" width={72} height={72} loading="lazy" className="h-18 w-18 shrink-0 rounded-lg bg-stone-50 object-contain" />
            )}
            <div className="flex min-w-0 flex-1 flex-col">
              <a href={`/produse/${o.slug}`} className="line-clamp-2 text-sm font-medium text-stone-900 hover:underline">
                {o.name}
              </a>
              <p className="text-xs text-stone-600">{o.store}</p>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                <span className="font-bold text-stone-900">{formatPrice(o.price, o.currency)}</span>
                <a href={`/go/${o.slug}?sursa=comparatie`} rel="sponsored nofollow" className={buyClass}>
                  Vezi oferta
                </a>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function History({ history, currency, lineColor }: { history: PriceHistoryView; currency: string | null; lineColor?: string }) {
  if (!history.hasChanges) {
    return (
      <p className="mt-2 text-sm text-stone-700">
        Urmărim prețul acestui produs din {formatDay(history.since)}. De atunci nu s-a schimbat: {formatPrice(history.current, currency)}.
      </p>
    );
  }
  const change = history.price30DaysAgo > 0 ? (history.current - history.price30DaysAgo) / history.price30DaysAgo : 0;
  const changeText =
    Math.abs(change) < 0.005 ? "Același preț" : `${change < 0 ? "−" : "+"}${Math.abs(Math.round(change * 100))}% (${change < 0 ? "mai ieftin" : "mai scump"})`;
  const isLowest = history.current <= history.min30 + 0.005;
  const tiles = [
    { label: `Cel mai mic, ultimele ${history.windowDays} zile`, value: formatPrice(history.min30, currency) },
    { label: `Cel mai mare, ultimele ${history.windowDays} zile`, value: formatPrice(history.max30, currency) },
    { label: `Față de acum ${history.windowDays} zile`, value: changeText },
  ];
  const tablePoints = [...history.points].reverse();

  return (
    <div className="mt-3">
      {isLowest && (
        <p className="mb-3 inline-block rounded-full bg-stone-900 px-3 py-1 text-sm font-semibold text-white">Cel mai mic preț din ultimele {history.windowDays} zile</p>
      )}
      <dl className="grid gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-stone-200 bg-white px-4 py-3">
            <dt className="text-xs text-stone-600">{t.label}</dt>
            <dd className="mt-0.5 text-lg font-semibold text-stone-900">{t.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-white p-3">
        <PriceChart points={history.points} current={history.current} lineColor={lineColor} />
      </div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-stone-700 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900">
          Vezi toate prețurile
        </summary>
        <table className="mt-2 w-full max-w-md text-left">
          <thead>
            <tr className="border-b border-stone-300 text-xs text-stone-600">
              <th scope="col" className="py-1.5 font-medium">De la data</th>
              <th scope="col" className="py-1.5 font-medium">Preț</th>
            </tr>
          </thead>
          <tbody>
            {tablePoints.map((p) => (
              <tr key={p.date} className="border-b border-stone-100">
                <td className="py-1.5 text-stone-700">{formatDay(p.date)}</td>
                <td className="py-1.5 font-medium text-stone-900">{formatPrice(p.price, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-1 text-xs text-stone-500">Urmărim prețul din {formatDay(history.since)}.</p>
      </details>
    </div>
  );
}
