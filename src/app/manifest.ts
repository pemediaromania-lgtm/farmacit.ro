import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Farmatic.ro — sănătate și naturețe, pe înțelesul tuturor",
    short_name: "Farmatic.ro",
    description:
      "Magazin online pentru produse farmaceutice, naturiste și suplimente alimentare, de la farmacii și magazine partenere de încredere.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#16a34a",
    lang: "ro-RO",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
