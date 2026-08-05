import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Cum poți lua legătura cu echipa Farmatic.ro.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold text-brand-900 mb-6">Contact</h1>
      <div className="prose-farmatic text-brand-950">
        <p>
          Pentru întrebări despre produse, articole, o eroare pe site sau orice altă nelămurire, ne poți
          scrie oricând la:
        </p>
        <p>
          <a
            href="mailto:contact@farmatic.ro"
            className="text-lg font-semibold text-brand-700 underline hover:text-brand-900"
          >
            contact@farmatic.ro
          </a>
        </p>
        <p>
          Îți răspundem în cel mai scurt timp posibil. Pentru solicitări legate de datele tale personale
          (acces, corectare, ștergere), vezi și{" "}
          <a href="/confidentialitate" className="text-brand-600 underline hover:text-brand-800">
            Politica de confidențialitate
          </a>
          .
        </p>
        <p className="text-sm text-brand-800/60 mt-8">
          Operator: PFA Anglita Paul Mihai, CUI 46638903.
        </p>
      </div>
    </div>
  );
}
