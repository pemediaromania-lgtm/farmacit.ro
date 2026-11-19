import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { confirmPriceAlert, unsubscribePriceAlert } from "@/lib/prices/alerts";

// Confirmarea și dezabonarea alertei de preț (linkurile din emailuri).
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Alertă de preț" };

type Props = {
  params: Promise<{ actiune: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function PriceAlertPage({ params, searchParams }: Props) {
  const { actiune } = await params;
  const { token } = await searchParams;
  if (actiune !== "confirmare" && actiune !== "dezabonare") notFound();

  const alert = token ? (actiune === "confirmare" ? await confirmPriceAlert(token) : await unsubscribePriceAlert(token)) : null;

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      {!alert ? (
        <>
          <h1 className="text-2xl font-bold text-stone-900">Linkul nu mai e valabil</h1>
          <p className="mt-3 text-stone-700">Poate ai cerut între timp o alertă nouă pentru același produs. Folosește linkul din cel mai recent email.</p>
        </>
      ) : actiune === "confirmare" ? (
        <>
          <h1 className="text-2xl font-bold text-stone-900">Alerta de preț e activă</h1>
          <p className="mt-3 text-stone-700">
            Îți scriem când scade prețul produsului <strong>{alert.product.name}</strong>. Primești un singur email, iar în el ai și linkul de dezabonare.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-stone-900">Te-ai dezabonat</h1>
          <p className="mt-3 text-stone-700">
            Nu mai primești alerte de preț pentru <strong>{alert.product.name}</strong>.
          </p>
        </>
      )}
      {alert && (
        <p className="mt-6">
          <Link href={`/produse/${alert.product.slug}`} className="font-semibold text-stone-900 underline underline-offset-4">
            Înapoi la produs
          </Link>
        </p>
      )}
    </div>
  );
}
