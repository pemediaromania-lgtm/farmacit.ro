"use client";

import { useState, type ReactNode } from "react";
import { ProductImage } from "@/components/site/ProductImage";

/**
 * Galeria de pe pagina produsului: poza mare + miniaturi cu toate pozele primite în feed (după modelul casain2).
 * Cu o singură poză arată exact ca înainte. Miniaturile care nu se încarcă (magazinul blochează imaginea) dispar,
 * ca vizitatorul să nu poată alege o poză spartă.
 */
export function ProductGallery({ images, alt, overlay }: { images: string[]; alt: string; overlay?: ReactNode }) {
  const [current, setCurrent] = useState<string | null>(images[0] ?? null);
  const [broken, setBroken] = useState<string[]>([]);
  const thumbs = images.filter((src) => !broken.includes(src));

  return (
    <div>
      <div className="relative aspect-square w-full rounded-2xl bg-brand-50 overflow-hidden">
        {overlay}
        <ProductImage key={current ?? "none"} src={current} alt={alt} className="h-full w-full object-contain p-8" />
      </div>
      {thumbs.length > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {thumbs.map((src, i) => (
            <li key={src} className="shrink-0">
              <button
                type="button"
                onClick={() => setCurrent(src)}
                aria-label={`Poza ${i + 1}`}
                aria-current={src === current}
                className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border bg-white p-1 transition-colors ${src === current ? "border-brand-500 ring-2 ring-brand-200" : "border-brand-100 hover:border-brand-300"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="max-h-full max-w-full object-contain"
                  onError={() => setBroken((list) => [...list, src])}
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
