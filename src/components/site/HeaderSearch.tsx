"use client";

import { useEffect, useRef, useState } from "react";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 21l-4.3-4.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Bară de căutare produse. Pe ecrane sm+ e vizibilă direct în header; pe mobil
 * (unde nu mai încape lângă logo + navigație) e doar o iconiță care deschide un
 * modal cu câmpul de căutare. Ambele trimit prin GET la /produse?q=..., fără JS
 * necesar pentru căutarea în sine — doar deschiderea modalului e interactivă.
 */
export function HeaderSearch() {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <form action="/produse" method="get" className="hidden sm:flex items-center">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-400" />
          <input
            type="search"
            name="q"
            placeholder="Caută produse..."
            className="w-40 lg:w-56 rounded-full border border-brand-200 bg-white pl-9 pr-3 py-1.5 text-sm text-brand-900 placeholder:text-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
      </form>

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Caută produse"
        className="sm:hidden p-2 -mr-2 text-brand-700 hover:text-brand-900"
      >
        <SearchIcon className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div className="absolute inset-0 bg-brand-950/40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute top-0 left-0 right-0 bg-white p-4 shadow-lg">
            <form
              action="/produse"
              method="get"
              className="flex items-center gap-2"
              onSubmit={() => setOpen(false)}
            >
              <div className="relative flex-1">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-400" />
                <input
                  ref={inputRef}
                  type="search"
                  name="q"
                  placeholder="Caută produse..."
                  className="w-full rounded-full border border-brand-200 pl-9 pr-3 py-2 text-sm text-brand-900 placeholder:text-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 text-sm font-medium text-brand-700 px-2"
              >
                Anulează
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
