import { prisma } from "@/lib/prisma";
import { createFeedAction, deleteFeedAction, syncFeedAction, uploadFeedAction } from "@/lib/actions/adminActions";
import { DeleteFeedButton } from "@/components/admin/DeleteFeedButton";

const isUploadFeed = (url: string) => url.startsWith("upload:");

export default async function AdminFeedsPage() {
  const feeds = await prisma.feed.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-900 mb-6">Feed-uri</h1>

      <form
        action={createFeedAction}
        className="rounded-2xl bg-white border border-brand-100 p-6 mb-8 grid gap-4 sm:grid-cols-[1fr_2fr_auto] items-end"
      >
        <div>
          <label className="block text-sm font-medium text-brand-900 mb-1">Nume</label>
          <input
            name="name"
            required
            placeholder="ex: 2Performant — Farmacie X"
            className="w-full rounded-lg border border-brand-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-900 mb-1">URL feed (XML/CSV)</label>
          <input
            name="url"
            type="url"
            required
            placeholder="https://..."
            className="w-full rounded-lg border border-brand-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
        <button
          type="submit"
          className="rounded-full bg-brand-600 text-white font-medium px-6 py-2.5 hover:bg-brand-700 transition-colors"
        >
          Adaugă feed
        </button>
      </form>

      <form
        action={uploadFeedAction.bind(null, null)}
        className="rounded-2xl bg-white border border-brand-100 p-6 mb-8 grid gap-4 sm:grid-cols-[1fr_2fr_auto] items-end"
      >
        <div>
          <label className="block text-sm font-medium text-brand-900 mb-1">Nume</label>
          <input
            name="name"
            required
            placeholder="ex: 2Performant — springfarma.com"
            className="w-full rounded-lg border border-brand-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-900 mb-1">Fișier CSV/XML</label>
          <input
            name="file"
            type="file"
            accept=".csv,.xml,text/csv,text/xml,application/xml"
            required
            className="w-full rounded-lg border border-brand-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 file:mr-3 file:rounded-full file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-brand-700"
          />
        </div>
        <button
          type="submit"
          className="rounded-full bg-brand-600 text-white font-medium px-6 py-2.5 hover:bg-brand-700 transition-colors whitespace-nowrap"
        >
          Încarcă fișier
        </button>
      </form>

      <div className="rounded-2xl bg-white border border-brand-100 divide-y divide-brand-50">
        {feeds.length === 0 && <p className="p-5 text-sm text-brand-800/60">Niciun feed adăugat încă.</p>}
        {feeds.map((feed) => (
          <div key={feed.id} className="p-5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium text-brand-900">{feed.name}</p>
              <p className="text-xs text-brand-800/60 truncate max-w-md">
                {isUploadFeed(feed.url) ? "fișier încărcat manual" : feed.url}
              </p>
              <p className="text-xs mt-1">
                <span className="text-brand-800/70">{feed._count.products} produse</span>
                {feed.lastImportedAt && (
                  <span className="text-brand-800/50">
                    {" "}
                    · ultima sincronizare: {feed.lastImportedAt.toLocaleString("ro-RO")}
                  </span>
                )}
                {feed.lastStatus === "error" && <span className="text-red-600 font-medium"> · eroare</span>}
              </p>
              {feed.lastStatus === "error" && feed.lastError && (
                <p className="text-xs text-red-600 mt-1">{feed.lastError}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isUploadFeed(feed.url) ? (
                <form action={uploadFeedAction.bind(null, feed.id)} className="flex items-center gap-2">
                  <input
                    name="file"
                    type="file"
                    accept=".csv,.xml,text/csv,text/xml,application/xml"
                    required
                    className="text-xs w-48 file:mr-2 file:rounded-full file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-brand-700"
                  />
                  <button
                    type="submit"
                    className="rounded-full border border-brand-300 text-brand-700 font-medium px-5 py-2 hover:bg-brand-50 transition-colors whitespace-nowrap"
                  >
                    Încarcă fișier nou
                  </button>
                </form>
              ) : (
                <form action={syncFeedAction.bind(null, feed.id)}>
                  <button
                    type="submit"
                    className="rounded-full border border-brand-300 text-brand-700 font-medium px-5 py-2 hover:bg-brand-50 transition-colors whitespace-nowrap"
                  >
                    Sincronizează acum
                  </button>
                </form>
              )}
              <DeleteFeedButton
                feedName={feed.name}
                productCount={feed._count.products}
                action={deleteFeedAction.bind(null, feed.id)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
