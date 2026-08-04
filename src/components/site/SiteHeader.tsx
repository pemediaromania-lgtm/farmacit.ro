import Link from "next/link";
import Image from "next/image";
import { HeaderSearch } from "@/components/site/HeaderSearch";

export function SiteHeader() {
  return (
    <header className="border-b border-brand-100 bg-white/90 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 flex items-center justify-between h-16 gap-4">
        <Link href="/" className="flex items-center shrink-0">
          <Image
            src="/logo.png"
            alt="Farmatic.ro"
            width={992}
            height={240}
            priority
            className="h-7 sm:h-8 w-auto"
          />
        </Link>
        <nav className="flex items-center gap-4 sm:gap-6 text-sm font-medium text-brand-900">
          <Link href="/" className="hidden sm:inline hover:text-brand-600">
            Acasă
          </Link>
          <Link href="/blog" className="hover:text-brand-600">
            Blog
          </Link>
          <Link href="/produse" className="hover:text-brand-600">
            Produse
          </Link>
          <HeaderSearch />
        </nav>
      </div>
    </header>
  );
}
