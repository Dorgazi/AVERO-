import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <div className="mx-auto max-w-xl px-4 py-32 text-center">
          <p className="label text-stone-deep">404</p>
          <h1 className="mt-4 text-5xl">Not on the rail.</h1>
          <p className="mt-4 text-charcoal-soft">We couldn&apos;t find that page.</p>
          <Link href="/shop" className="btn btn-primary mt-10">Back to the shop</Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
