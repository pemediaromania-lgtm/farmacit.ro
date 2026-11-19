"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Graficul prețului în timp: o singură serie, în trepte (prețul rămâne același până la următoarea schimbare), linie de 2px,
 * punct și valoare la capăt, grilă discretă. La hover/atingere sau din tastatură (săgeți), o linie verticală se oprește pe
 * cea mai apropiată schimbare de preț și un tooltip arată data și prețul. Tabelul cu toate prețurile e lângă grafic.
 */

interface Point {
  date: string;
  price: number;
}

const HEIGHT = 190;
const PAD = { top: 18, right: 86, bottom: 26, left: 58 };

const fmt = (v: number) => {
  const decimals = Math.abs(v - Math.round(v)) < 0.005 ? 0 : 2;
  return `${v.toLocaleString("ro-RO", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} lei`;
};
const day = (t: number) => new Date(t).toLocaleDateString("ro-RO", { day: "numeric", month: "short", timeZone: "Europe/Bucharest" });

function niceTicks(min: number, max: number): number[] {
  const span = max - min || Math.max(1, max * 0.1);
  const raw = span / 3;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.5 && ticks.length < 6; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

export function PriceChart({ points, current, lineColor = "var(--color-brand-700)" }: { points: Point[]; current: number; lineColor?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Schimbările de preț (puncte succesive cu același preț se contopesc) + „azi” cu prețul de acum.
  const steps = useMemo(() => {
    const out: { t: number; price: number }[] = [];
    for (const p of points) {
      const t = new Date(p.date).getTime();
      if (out.length === 0 || Math.abs(out[out.length - 1].price - p.price) >= 0.01) out.push({ t, price: p.price });
    }
    if (out.length === 0 || Math.abs(out[out.length - 1].price - current) >= 0.01) out.push({ t: Date.now(), price: current });
    return out;
  }, [points, current]);

  const now = Date.now();
  const t0 = steps[0].t;
  const t1 = Math.max(now, t0 + 24 * 60 * 60 * 1000);
  const prices = steps.map((s) => s.price);
  const ticks = niceTicks(Math.min(...prices), Math.max(...prices));
  const yMin = Math.min(ticks[0], ...prices);
  const yMax = Math.max(ticks[ticks.length - 1], ...prices);
  const plotW = width - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (t: number) => PAD.left + ((t - t0) / (t1 - t0)) * plotW;
  const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin || 1)) * plotH;

  let d = "";
  steps.forEach((s, i) => {
    const nextT = i + 1 < steps.length ? steps[i + 1].t : t1;
    d += `${i === 0 ? "M" : "L"}${x(s.t).toFixed(1)},${y(s.price).toFixed(1)} H${x(nextT).toFixed(1)} `;
  });

  const last = steps[steps.length - 1];
  const focus = active != null ? steps[active] : null;

  function nearest(clientX: number, rect: DOMRect) {
    const px = clientX - rect.left;
    let best = 0;
    steps.forEach((s, i) => {
      if (Math.abs(x(s.t) - px) < Math.abs(x(steps[best].t) - px)) best = i;
    });
    return best;
  }

  return (
    <div ref={wrapRef} className="relative">
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        tabIndex={0}
        aria-label={`Prețul de la ${day(t0)} până azi: între ${fmt(Math.min(...prices))} și ${fmt(Math.max(...prices))}, acum ${fmt(current)}. Folosește săgețile pentru fiecare schimbare de preț.`}
        className="block touch-none rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
        onPointerMove={(e) => setActive(nearest(e.clientX, e.currentTarget.getBoundingClientRect()))}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive(steps.length - 1)}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? steps.length - 1) - 1));
          if (e.key === "ArrowRight") setActive((a) => Math.min(steps.length - 1, (a ?? 0) + 1));
        }}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={PAD.left + plotW} y1={y(v)} y2={y(v)} stroke="#e7e5e4" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(v)} dy="0.32em" textAnchor="end" fontSize={11} fill="#78716c">
              {v.toLocaleString("ro-RO", { maximumFractionDigits: v < 100 ? 2 : 0 })}
            </text>
          </g>
        ))}
        <text x={PAD.left} y={HEIGHT - 6} fontSize={11} fill="#78716c">
          {day(t0)}
        </text>
        <text x={PAD.left + plotW} y={HEIGHT - 6} fontSize={11} fill="#78716c" textAnchor="end">
          azi
        </text>
        <path d={d} fill="none" stroke={lineColor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(t1)} cy={y(last.price)} r={4} fill={lineColor} stroke="#ffffff" strokeWidth={2} />
        <text x={x(t1) + 8} y={y(last.price)} dy="0.32em" fontSize={12} fontWeight={700} fill="#1c1917">
          {fmt(last.price)}
        </text>
        {focus && (
          <g pointerEvents="none">
            <line x1={x(focus.t)} x2={x(focus.t)} y1={PAD.top} y2={PAD.top + plotH} stroke="#a8a29e" strokeWidth={1} />
            <circle cx={x(focus.t)} cy={y(focus.price)} r={4} fill={lineColor} stroke="#ffffff" strokeWidth={2} />
          </g>
        )}
      </svg>
      {focus && (
        <div
          className="pointer-events-none absolute top-0 z-10 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm shadow-md"
          style={{ left: Math.min(Math.max(0, x(focus.t) - 70), width - 150) }}
          role="status"
        >
          <p className="font-bold text-stone-900">{fmt(focus.price)}</p>
          <p className="text-xs text-stone-600">din {new Date(focus.t).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Bucharest" })}</p>
        </div>
      )}
    </div>
  );
}
