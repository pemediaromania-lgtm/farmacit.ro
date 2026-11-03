"use client";

import { Fragment, useSyncExternalStore } from "react";
import { BLACK_FRIDAY_ENDS, BLACK_FRIDAY_STARTS } from "@/lib/blackFriday";

/**
 * Numărătoarea inversă din bannerul Black Friday: până la start numără până la weekendul Black Friday, în timpul lui
 * până la final, apoi dispare. Ora vine din browser; pe server (și la hidratare) se văd doar căsuțele goale, ca
 * markup-ul să fie identic. Roșu cu alb și animat (cerut de Paul): cifra nouă intră rotindu-se (key={value} o
 * remontează), căsuțele pulsează și le traversează o lumină; fără animații la „prefers-reduced-motion”.
 */
const STARTS_AT = Date.parse(BLACK_FRIDAY_STARTS);
const ENDS_AT = Date.parse(BLACK_FRIDAY_ENDS);

const CSS = `
@keyframes bfc-digit{from{opacity:0;transform:translateY(-55%) rotateX(80deg)}to{opacity:1;transform:none}}
@keyframes bfc-glow{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.6)}50%{box-shadow:0 0 22px 3px rgba(239,68,68,.6)}}
@keyframes bfc-shine{0%{transform:translateX(-160%) skewX(-20deg)}40%,100%{transform:translateX(260%) skewX(-20deg)}}
@keyframes bfc-blink{0%,100%{opacity:1}50%{opacity:.15}}
.bfc-digit{animation:bfc-digit .45s cubic-bezier(.2,.8,.2,1) both;transform-origin:50% 0}
.bfc-box{animation:bfc-glow 2s ease-in-out infinite;perspective:300px}
.bfc-shine{animation:bfc-shine 3.5s ease-in-out infinite}
.bfc-colon{animation:bfc-blink 1s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.bfc-digit,.bfc-box,.bfc-shine,.bfc-colon{animation:none}.bfc-shine{display:none}}
`;

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
    <div
      role="timer"
      aria-label={known ? `${title} ${parts.map((p) => `${p.value} ${p.label}`).join(" ")}` : title}
      className="rounded-2xl bg-gradient-to-br from-red-700/40 to-red-950/30 p-3 ring-1 ring-red-500/50"
    >
      <style>{CSS}</style>
      <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-white">
        <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
        </span>
        {title}
      </p>
      <div className="mt-2.5 flex items-center gap-1.5">
        {parts.map((p, i) => (
          <Fragment key={p.label}>
            {i > 0 && (
              <span className="bfc-colon text-2xl font-black text-red-500" aria-hidden="true">
                :
              </span>
            )}
            <div className="bfc-box relative w-14 overflow-hidden rounded-xl bg-gradient-to-b from-red-500 to-red-700 py-2 text-center ring-1 ring-white/25 sm:w-16">
              <span
                key={known ? p.value : "--"}
                className="bfc-digit block font-mono text-2xl font-black tabular-nums text-white sm:text-3xl"
              >
                {known ? String(p.value).padStart(2, "0") : "--"}
              </span>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-white/85">{p.label}</span>
              <span className="absolute inset-x-0 top-[42%] h-px bg-black/25" aria-hidden="true" />
              <span
                className="bfc-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                aria-hidden="true"
              />
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
