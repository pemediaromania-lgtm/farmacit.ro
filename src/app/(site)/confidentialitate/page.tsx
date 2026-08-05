import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politica de confidențialitate",
  description: "Ce date colectăm pe Farmatic.ro, de ce, și ce drepturi ai conform GDPR.",
  alternates: { canonical: "/confidentialitate" },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold text-brand-900 mb-2">Politica de confidențialitate</h1>
      <p className="text-sm text-brand-800/60 mb-6">Ultima actualizare: august 2026</p>

      <div className="prose-farmatic text-brand-950">
        <h2>Cine este operatorul datelor</h2>
        <p>
          Farmatic.ro este operat de PFA Anglita Paul Mihai (CUI 46638903). Pentru orice solicitare legată
          de datele tale personale, ne poți scrie la{" "}
          <a href="mailto:contact@farmatic.ro" className="text-brand-600 underline hover:text-brand-800">
            contact@farmatic.ro
          </a>
          .
        </p>

        <h2>Ce date colectăm</h2>
        <ul>
          <li>
            <strong>Recenzii de produse și comentarii la articole:</strong> numele afișat (poate fi orice
            pseudonim, nu cerem nume real) și textul trimis, publicate imediat pe pagina produsului/articolului.
          </li>
          <li>
            <strong>Date tehnice de navigare:</strong> adresă IP, tip de browser și pagini vizitate, colectate
            automat de infrastructura de găzduire (Railway) pentru securitate și funcționare, și — dacă
            Google Analytics este activ — pentru statistici agregate de trafic.
          </li>
          <li>
            <strong>Cookie-uri de afiliere:</strong> când dai click pe un link „Cumpără acum”, ești redirecționat
            către magazinul partener prin platforma de afiliere 2Performant, care poate seta propriile
            cookie-uri pentru a atribui comisionul. Farmatic.ro nu are acces la datele tale de plată sau
            comandă de la partener.
          </li>
        </ul>

        <h2>De ce colectăm aceste date</h2>
        <p>
          Recenziile și comentariile sunt publicate pe baza consimțământului tău explicit, dat prin
          completarea formularului. Datele tehnice de navigare sunt procesate pe baza interesului nostru
          legitim de a menține site-ul funcțional, sigur și de a înțelege ce conținut este util cititorilor.
        </p>

        <h2>Cui transmitem date</h2>
        <p>
          Nu vindem datele tale către terți. Colaborăm cu furnizori care procesează date strict în numele
          nostru: găzduirea site-ului (Railway), platforma de afiliere (2Performant) și, opțional, Google
          Analytics pentru statistici de trafic. Furnizorii de inteligență artificială folosiți pentru
          generarea articolelor (Anthropic, OpenAI) primesc doar descrieri de produse din catalog — niciodată
          date personale ale vizitatorilor.
        </p>

        <h2>Cât timp păstrăm datele</h2>
        <p>
          Recenziile și comentariile rămân publicate cât timp produsul/articolul asociat este activ pe site,
          sau până când soliciți ștergerea lor.
        </p>

        <h2>Drepturile tale (GDPR)</h2>
        <p>Ai dreptul să:</p>
        <ul>
          <li>Ceri acces la datele pe care le deținem despre tine.</li>
          <li>Ceri corectarea sau ștergerea unei recenzii/comentariu publicat.</li>
          <li>Te opui prelucrării bazate pe interes legitim.</li>
          <li>Depui o plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP), dacă consideri că drepturile tale au fost încălcate.</li>
        </ul>
        <p>
          Pentru orice solicitare de acest tip, scrie-ne la{" "}
          <a href="mailto:contact@farmatic.ro" className="text-brand-600 underline hover:text-brand-800">
            contact@farmatic.ro
          </a>
          .
        </p>
      </div>
    </div>
  );
}
