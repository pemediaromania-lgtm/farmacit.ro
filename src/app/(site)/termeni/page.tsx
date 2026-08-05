import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termeni și condiții",
  description: "Termenii de utilizare a Farmatic.ro și modul în care funcționează linkurile de afiliere.",
  alternates: { canonical: "/termeni" },
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold text-brand-900 mb-2">Termeni și condiții</h1>
      <p className="text-sm text-brand-800/60 mb-6">Ultima actualizare: august 2026</p>

      <div className="prose-farmatic text-brand-950">
        <h2>Ce este Farmatic.ro</h2>
        <p>
          Farmatic.ro (operat de PFA Anglita Paul Mihai, CUI 46638903) este un catalog și blog informativ
          despre produse farmaceutice, naturiste și suplimente alimentare. Nu vindem direct produsele
          afișate — te direcționăm către farmacii și magazine partenere, unde se finalizează efectiv comanda.

        </p>

        <h2>Divulgare afiliere</h2>
        <p>
          Farmatic.ro participă în programe de marketing afiliat (prin platforma 2Performant). Asta înseamnă
          că, atunci când cumperi un produs printr-un link „Cumpără acum” de pe site, putem primi un comision
          de la magazinul partener — <strong>fără niciun cost suplimentar pentru tine</strong>. Prețul pe care
          îl plătești este stabilit integral de magazinul partener, nu de Farmatic.ro.
        </p>
        <p>
          Comisionul primit nu influențează recomandările generale de conținut, dar recunoaștem deschis
          faptul că avem un interes comercial în produsele promovate — de aceea îți recomandăm mereu să
          verifici și alte surse înainte de o decizie de cumpărare.
        </p>

        <h2>Conținut informativ, nu medical</h2>
        <p>
          Articolele și descrierile de pe Farmatic.ro (inclusiv cele generate cu ajutorul inteligenței
          artificiale) au scop strict educativ și informativ. Nu constituie sfat medical, diagnostic sau
          tratament și nu înlocuiesc consultul unui medic sau farmacist. Nu garantăm acuratețea, completitudinea
          sau actualitatea informațiilor despre produse — pentru detalii exacte (compoziție, contraindicații,
          mod de administrare), consultă mereu eticheta produsului și prospectul oficial.
        </p>

        <h2>Recenzii și comentarii</h2>
        <p>
          Recenziile de produse și comentariile la articole sunt trimise liber de vizitatori și publicate
          imediat, fără moderare prealabilă. Nu ne asumăm exactitatea afirmațiilor din recenzii/comentarii.
          Ne rezervăm dreptul de a elimina conținut abuziv, ilegal sau spam.
        </p>

        <h2>Limitarea răspunderii</h2>
        <p>
          Farmatic.ro nu este responsabil pentru disponibilitatea, prețul, livrarea sau calitatea produselor
          comercializate de magazinele partenere — orice problemă legată de o comandă se rezolvă direct cu
          magazinul respectiv.
        </p>

        <h2>Modificări</h2>
        <p>
          Putem actualiza acești termeni periodic. Continuarea folosirii site-ului după o actualizare
          înseamnă acceptarea noii versiuni. Pentru întrebări, scrie-ne la{" "}
          <a href="mailto:contact@farmatic.ro" className="text-brand-600 underline hover:text-brand-800">
            contact@farmatic.ro
          </a>
          .
        </p>
      </div>
    </div>
  );
}
