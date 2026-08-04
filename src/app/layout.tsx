import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Farmatic.ro — sănătate și naturețe, pe înțelesul tuturor",
    template: "%s — Farmatic.ro",
  },
  description:
    "Farmatic.ro este locul tău de încredere pentru produse farmaceutice, naturiste și suplimente alimentare: recomandări clare, articole pozitive și un catalog de la farmacii și magazine partenere de încredere.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-white text-[var(--foreground)]">{children}</body>
    </html>
  );
}
