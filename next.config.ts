import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Feed-urile 2Performant (CSV) pot avea 10+ MB la zeci de mii de produse —
      // limita implicită de 1MB pentru Server Actions ar respinge upload-ul.
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
