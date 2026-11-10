import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="on-dark bg-espresso text-bone/70">
      <div className="mx-auto max-w-7xl px-5 pt-20 sm:px-8 md:pt-28">
        <div className="grid gap-14 md:grid-cols-12">
          <div className="md:col-span-6">
            <p className="eyebrow text-stone">The house</p>
            <p className="display mt-6 max-w-md text-3xl text-bone sm:text-4xl">
              One silhouette, <em className="italic">considered from every angle.</em>
            </p>
          </div>
          <nav aria-label="Footer: shop" className="md:col-span-3">
            <p className="text-[10px] uppercase tracking-[0.28em] text-stone">Shop</p>
            <ul className="mt-6 space-y-3 text-sm">
              <li><Link className="link-draw hover:text-bone" href="/shop">All pieces</Link></li>
              <li><Link className="link-draw hover:text-bone" href="/shop?category=t-shirts">T-Shirts</Link></li>
              <li><Link className="link-draw hover:text-bone" href="/shop?category=socks">Socks</Link></li>
              <li><Link className="link-draw hover:text-bone" href="/cart">Your bag</Link></li>
            </ul>
          </nav>
          <div className="md:col-span-3">
            <p className="text-[10px] uppercase tracking-[0.28em] text-stone">Client care</p>
            <ul className="mt-6 space-y-3 text-sm">
              <li>Delivery terms: to be confirmed</li>
              <li>Returns policy: to be confirmed</li>
              <li><Link className="link-draw hover:text-bone" href="/admin">Owner sign-in</Link></li>
            </ul>
          </div>
        </div>

        <p
          aria-hidden
          className="mt-24 select-none text-center font-serif font-light leading-none tracking-[0.3em] text-bone/[0.09]"
          style={{ fontSize: "clamp(4rem, 17vw, 15rem)", paddingLeft: "0.3em" }}
        >
          AVÉRO
        </p>
      </div>
      <div className="border-t border-bone/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-[11px] tracking-wide text-bone/50 sm:flex-row sm:justify-between sm:px-8">
          <p>© {year} AVÉRO. All rights reserved.</p>
          <p>Lagos, Nigeria · Prices in Nigerian naira (NGN)</p>
        </div>
      </div>
    </footer>
  );
}
