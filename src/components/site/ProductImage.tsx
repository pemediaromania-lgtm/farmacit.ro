"use client";

import { useState } from "react";

/**
 * Multe magazine partenere (ex: springfarma.com, protejate de Cloudflare) blochează
 * afișarea imaginilor lor pe alte domenii (header Cross-Origin-Resource-Policy),
 * indiferent dacă request-ul vine din browser sau de pe server. Când imaginea din
 * feed nu se încarcă, afișăm un placeholder pe tema verde/alb în loc de iconița de
 * imagine spartă.
 */
export function ProductImage({
  src,
  alt,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(!src);

  if (failed || !src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-brand-50 text-brand-300">
        <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-6.364-.386 1.591-1.591M3 12h2.25m.386-6.364 1.591 1.591M12 9a3 3 0 100 6 3 3 0 000-6Z"
          />
        </svg>
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}
