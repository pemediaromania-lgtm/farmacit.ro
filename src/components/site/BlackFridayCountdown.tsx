"use client";

import { useSyncExternalStore } from "react";
import { BLACK_FRIDAY_ENDS, BLACK_FRIDAY_STARTS } from "@/lib/blackFriday";

/**
 * Numărătoarea inversă din bannerul Black Friday: până la start numără până la weekendul Black Friday, în timpul lui
 * până la final, apoi dispare. Ora vine din browser; pe server (și la hidratare) se văd doar căsuțele goale, ca
 * markup-ul să fie identic.
 */
const STARTS_AT = Date.parse(BLACK_FRIDAY_STARTS);
const ENDS_AT = Date.parse(BLACK_FRIDAY_ENDS);

function split(total: number): { label: string; value: number }[] {
  return [
    { label: "zile", value: Math.floor(total / 86_400) },
    { label: "ore", value: Math.floor(total / 3_600) % 24 },
    { label: "min", value: Math.floor(total / 60) % 60 },
    { label: "sec", value: total % 60 },
  ];
}

function subscribe(onTick: () => void): () => void {
  const id = window.setInterval(onTick, 1000);
  return () => window.clearInterval(id);
}

/** Secunda curentă — aceeași valoare în toată secunda, ca React să nu randeze degeaba. */
function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function BlackFridayCountdown() {
  const seconds = useSyncExternalStore(subscribe, nowSeconds, () => 0);
  const now = seconds * 1000;
  if (now >= ENDS_AT) return null;

  const known = seconds > 0;
  const started = known && now >= STARTS_AT;
  const parts = split(known ? Math.floor(((started ? ENDS_AT : STARTS_AT) - now) / 1000) : 0);
  const title = started ? "Weekendul Black Friday se termină în" : "Weekendul Black Friday începe în";

  return (
    <div role="timer" aria-label={known ? `${title} ${parts.map((p) => `${p.value} ${p.label}`).join(" ")}` : title}>
      <p className="text-xs font-semibold uppercase tracking-wide text-white/70">{title}</p>
      <div className="mt-2 flex gap-2">
        {parts.map((p) => (
          <div key={p.label} className="w-14 rounded-lg bg-white/10 py-1.5 text-center">
            <span className="block font-mono text-2xl font-bold tabular-nums text-amber-400">
              {known ? String(p.value).padStart(2, "0") : "--"}
            </span>
            <span className="block text-[10px] uppercase tracking-wide text-white/60">{p.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
