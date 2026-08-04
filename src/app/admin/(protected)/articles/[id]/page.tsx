import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateArticleAction, publishArticleAction, unpublishArticleAction } from "@/lib/actions/adminActions";

export default async function AdminArticleEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await prisma.article.findUnique({ where: { id }, include: { product: true } });
  if (!article) notFound();

  const boundUpdate = updateArticleAction.bind(null, article.id);

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brand-900">Editează articol</h1>
        <form action={(article.status === "published" ? unpublishArticleAction : publishArticleAction).bind(null, article.id)}>
          <button
            type="submit"
            className={`rounded-full text-sm font-medium px-4 py-1.5 ${
              article.status === "published" ? "bg-zinc-100 text-zinc-600" : "bg-brand-600 text-white"
            }`}
          >
            {article.status === "published" ? "Retrage din publicare" : "Publică"}
          </button>
        </form>
      </div>

      {article.coverImageUrl && (
        <div className="relative w-full h-56 rounded-2xl overflow-hidden mb-6 bg-brand-50">
          <Image src={article.coverImageUrl} alt={article.title} fill className="object-cover" />
        </div>
      )}

      <form action={boundUpdate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-brand-900 mb-1">Titlu</label>
          <input
            name="title"
            defaultValue={article.title}
            required
            className="w-full rounded-lg border border-brand-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-900 mb-1">Rezumat</label>
          <textarea
            name="excerpt"
            defaultValue={article.excerpt ?? ""}
            rows={2}
            className="w-full rounded-lg border border-brand-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-900 mb-1">Conținut (markdown)</label>
          <textarea
            name="content"
            defaultValue={article.content}
            rows={16}
            required
            className="w-full rounded-lg border border-brand-200 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
        <button
          type="submit"
          className="rounded-full bg-brand-600 text-white font-medium px-6 py-2.5 hover:bg-brand-700 transition-colors"
        >
          Salvează modificările
        </button>
      </form>
    </div>
  );
}
