"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Filtrele de produse merg și fără JS (formular GET obișnuit). Cu JS: bifarea unei căsuțe sau
 * schimbarea sortării se aplică imediat, URL-ul rezultat nu conține parametri goi
 * (`pret_min=&pret_max=`), iar lista se reîncarcă fără reîncărcarea întregii pagini.
 *
 * Ascultăm pe document, nu pe formular: formularul e remontat la fiecare schimbare de filtre
 * (are `key` după URL), iar selectul de sortare stă în afara lui (atributul `form=`).
 */
export function FilterFormEnhancer({ formId, defaultSort }: { formId: string; defaultSort: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function navigate(form: HTMLFormElement) {
      const params = new URLSearchParams();
      for (const [key, value] of new FormData(form)) {
        if (typeof value !== "string" || !value.trim()) continue;
        if (key === "sortare" && value === defaultSort) continue;
        params.append(key, value.trim());
      }
      const qs = params.toString();
      startTransition(() => router.push(qs ? `/produse?${qs}` : "/produse", { scroll: false }));
    }

    function onSubmit(event: SubmitEvent) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || form.id !== formId) return;
      event.preventDefault();
      navigate(form);
    }

    function onChange(event: Event) {
      const target = event.target;
      const isToggle = target instanceof HTMLInputElement && (target.type === "checkbox" || target.type === "radio");
      if ((isToggle || target instanceof HTMLSelectElement) && target.form?.id === formId) navigate(target.form);
    }

    document.addEventListener("submit", onSubmit);
    document.addEventListener("change", onChange);
    return () => {
      document.removeEventListener("submit", onSubmit);
      document.removeEventListener("change", onChange);
    };
  }, [formId, defaultSort, router]);

  return pending ? (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-brand-900 px-4 py-2 text-sm font-medium text-white shadow-lg"
    >
      Se actualizează lista…
    </div>
  ) : null;
}
