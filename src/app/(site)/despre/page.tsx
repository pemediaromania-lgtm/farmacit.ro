import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Despre noi",
  description:
    "Cine suntem, ce facem și cum alegem produsele farmaceutice, naturiste și suplimentele recomandate pe Farmatic.ro.",
  alternates: { canonical: "/despre" },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold text-brand-900 mb-6">Despre Farmatic.ro</h1>
      <div className="prose-farmatic text-brand-950">
        <p>
          Farmatic.ro este un catalog online de produse farmaceutice, naturiste și suplimente alimentare,
          creat pentru a te ajuta să găsești mai ușor produse de calitate, dintr-un singur loc, în loc să cauți
          separat pe zeci de site-uri de farmacii și magazine naturiste.
        </p>

        <h2>Ce facem</h2>
        <p>
          Colectăm și organizăm produse de la farmacii și magazine partenere de încredere, le grupăm pe
          categorii clare și scriem articole informative despre nutriție, sănătate și îngrijire naturistă,
          inspirate din produsele reale din catalog. Când cumperi printr-un link de pe Farmatic.ro, este
          posibil să primim un comision de la partenerul respectiv — fără niciun cost suplimentar pentru tine.
          Detalii complete găsești în{" "}
          <a href="/termeni" className="text-brand-600 underline hover:text-brand-800">
            Termenii și condițiile
          </a>{" "}
          site-ului.
        </p>

        <h2>Cum alegem conținutul</h2>
        <p>
          O parte din articolele de pe blog sunt generate cu ajutorul inteligenței artificiale, pe baza
          informațiilor reale din descrierile produselor, și sunt revizuite periodic. Ele au scop strict
          informativ și educativ — nu reprezintă sfat medical și nu înlocuiesc consultul unui medic sau
          farmacist. Nu afirmăm și nu sugerăm că vreun produs tratează sau vindecă vreo afecțiune.
        </p>

        <h2>Cine suntem</h2>
        <p>
          Farmatic.ro este operat de PFA Anglita Paul Mihai (CUI 46638903). Pentru întrebări, sugestii sau
          nelămuriri, ne găsești pe pagina de{" "}
          <a href="/contact" className="text-brand-600 underline hover:text-brand-800">
            Contact
          </a>
          .
        </p>
      </div>
    </div>
  );
}
