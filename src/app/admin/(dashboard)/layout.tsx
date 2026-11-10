import Link from "next/link";
import { requireOwnerPage } from "@/lib/auth";
import { signOut } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: LayoutProps<"/admin">) {
  const owner = await requireOwnerPage();

  return (
    <>
      <header className="border-b border-stone/60 bg-bone">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-serif text-xl tracking-[0.28em] text-espresso">AVÉRO</Link>
            <nav aria-label="Admin">
              <ul className="flex gap-4">
                <li><Link href="/admin" className="label py-3 text-charcoal hover:text-espresso">Products</Link></li>
                <li><Link href="/admin/products/new" className="label py-3 text-charcoal hover:text-espresso">New</Link></li>
                <li><Link href="/" className="label py-3 text-charcoal hover:text-espresso">Storefront ↗</Link></li>
              </ul>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-charcoal-soft sm:inline" title="Signed in as owner">{owner.email}</span>
            <form action={signOut}>
              <button type="submit" className="label min-h-11 px-2 text-charcoal hover:text-espresso">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-8">{children}</main>
    </>
  );
}
