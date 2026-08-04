import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/admin/SignOutButton";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/feeds", label: "Feed-uri" },
  { href: "/admin/products", label: "Produse" },
  { href: "/admin/articles", label: "Articole" },
  { href: "/admin/activity", label: "Activitate" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  return (
    <div className="min-h-screen flex bg-brand-50/40">
      <aside className="w-56 shrink-0 bg-white border-r border-brand-100 flex flex-col">
        <div className="h-16 flex items-center px-5 font-semibold text-brand-800 border-b border-brand-100">
          Farmatic Admin
        </div>
        <nav className="flex-1 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-5 py-2 text-sm font-medium text-brand-800 hover:bg-brand-50 hover:text-brand-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-5 border-t border-brand-100 flex items-center justify-between">
          <span className="text-xs text-brand-700 truncate">{session.user.email}</span>
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 p-8 max-w-5xl">{children}</main>
    </div>
  );
}
