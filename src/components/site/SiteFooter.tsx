import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-brand-100 bg-brand-50 mt-auto">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 text-sm text-brand-800 space-y-4">
        <nav className="flex flex-wrap gap-x-6 gap-y-2 justify-center sm:justify-start">
          <Link href="/despre" className="hover:text-brand-900 hover:underline">
            Despre noi
          </Link>
          <Link href="/contact" className="hover:text-brand-900 hover:underline">
            Contact
          </Link>
          <Link href="/termeni" className="hover:text-brand-900 hover:underline">
            Termeni și condiții
          </Link>
          <Link href="/confidentialitate" className="hover:text-brand-900 hover:underline">
            Confidențialitate
          </Link>
        </nav>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-brand-100 pt-4">
          <p>&copy; {new Date().getFullYear()} Farmatic.ro — sănătate și naturețe, pe înțelesul tuturor.</p>
          <p className="text-brand-700/80 text-center sm:text-right">
            Conținutul are scop informativ și nu înlocuiește sfatul unui medic sau farmacist. Site-ul poate
            primi comision din linkurile de afiliere, fără cost suplimentar pentru tine.
          </p>
        </div>
      </div>
    </footer>
  );
}
