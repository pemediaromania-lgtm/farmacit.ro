"use client";

import { useState } from "react";

/** „Anunță-mă când scade prețul”: email + acord explicit → email de confirmare (vezi lib/prices/alerts.ts). */
export function PriceAlertForm({ productId }: { productId: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "already" | "invalid" | "error">("idle");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("sending");
    try {
      const res = await fetch("/api/alerta-pret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, email: form.get("email"), consent: form.get("consent") === "on", website: form.get("website") }),
      });
      const data = (await res.json().catch(() => ({}))) as { result?: string };
      if (data.result === "sent") setStatus("sent");
      else if (data.result === "already-active") setStatus("already");
      else if (data.result === "invalid") setStatus("invalid");
      else setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <p className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-800" role="status">
        Ți-am trimis un email. Apasă linkul de confirmare din el și te anunțăm când scade prețul.
      </p>
    );
  }
  if (status === "already") {
    return (
      <p className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-800" role="status">
        Ai deja o alertă activă pentru acest produs. Te anunțăm când scade prețul.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="relative rounded-xl border border-stone-200 bg-stone-50 p-4">
      <label htmlFor="alerta-email" className="block text-sm font-semibold text-stone-900">
        Anunță-mă când scade prețul
      </label>
      {/* Câmp anti-spam, ascuns vizual — un bot îl completează, un vizitator real nu-l vede */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden" aria-hidden="true" />
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id="alerta-email"
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          placeholder="adresa ta de email"
          className="min-w-0 flex-1 rounded-full border border-stone-400 bg-white px-4 py-2.5 text-sm text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="whitespace-nowrap rounded-full bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 disabled:opacity-60"
        >
          {status === "sending" ? "Se trimite…" : "Anunță-mă"}
        </button>
      </div>
      <label className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-stone-700">
        <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 shrink-0 accent-stone-900" />
        <span>Sunt de acord să primesc un email când scade prețul acestui produs. Adresa nu e folosită în alt scop, iar fiecare email are link de dezabonare.</span>
      </label>
      {status === "invalid" && <p className="mt-2 text-sm text-stone-900" role="alert">Adresa de email nu pare corectă.</p>}
      {status === "error" && <p className="mt-2 text-sm text-stone-900" role="alert">Nu s-a putut trimite acum. Încearcă din nou peste câteva minute.</p>}
    </form>
  );
}
