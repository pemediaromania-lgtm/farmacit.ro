import type { Metadata } from "next";
import { Analytics } from "@/components/Analytics";
import "./globals.css";

const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const siteName = "Farmatic.ro";
const siteDescription =
  "Farmatic.ro este locul tău de încredere pentru produse farmaceutice, naturiste și suplimente alimentare: recomandări clare, articole pozitive și un catalog de la farmacii și magazine partenere de încredere.";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Farmatic.ro — sănătate și naturețe, pe înțelesul tuturor",
    template: "%s — Farmatic.ro",
  },
  description: siteDescription,
  alternates: { canonical: baseUrl },
  openGraph: {
    siteName,
    title: "Farmatic.ro — sănătate și naturețe, pe înțelesul tuturor",
    description: siteDescription,
    url: baseUrl,
    locale: "ro_RO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Farmatic.ro — sănătate și naturețe, pe înțelesul tuturor",
    description: siteDescription,
  },
  // Google Search Console — verifică proprietatea site-ului pentru indexare.
  verification: {
    google: "shTciD8fObfIL0MZe9e2oKsn9P58-dj4CoVB5hc_cM4",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteName,
  url: baseUrl,
  description: siteDescription,
  logo: {
    "@type": "ImageObject",
    url: `${baseUrl}/icon-512.png`,
    width: 512,
    height: 512,
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteName,
  url: baseUrl,
  potentialAction: {
    "@type": "SearchAction",
    target: `${baseUrl}/produse?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-white text-[var(--foreground)]">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
        <Analytics />
        {children}
      </body>
    </html>
  );
}
