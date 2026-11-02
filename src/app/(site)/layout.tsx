import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { EsimpaticPromo } from "@/components/site/EsimpaticPromo";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />
      <EsimpaticPromo />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
