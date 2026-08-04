export function SiteFooter() {
  return (
    <footer className="border-t border-brand-100 bg-brand-50 mt-auto">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 text-sm text-brand-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p>&copy; {new Date().getFullYear()} Farmatic.ro — sănătate și naturețe, pe înțelesul tuturor.</p>
        <p className="text-brand-700/80">
          Conținutul are scop informativ și nu înlocuiește sfatul unui medic sau farmacist.
        </p>
      </div>
    </footer>
  );
}
