import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="on-dark mt-24 bg-espresso text-bone/80">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-8 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-serif text-3xl tracking-[0.28em] text-bone">AVÉRO</p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed">
            One silhouette, considered from every angle. Structured, boxy-fit menswear made for Lagos and beyond.
          </p>
        </div>
        <nav aria-label="Footer: shop">
          <p className="label text-stone">Shop</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link className="hover:text-bone" href="/shop">All pieces</Link></li>
            <li><Link className="hover:text-bone" href="/shop?category=t-shirts">T-Shirts</Link></li>
            <li><Link className="hover:text-bone" href="/shop?category=socks">Socks</Link></li>
            <li><Link className="hover:text-bone" href="/cart">Your bag</Link></li>
          </ul>
        </nav>
        <div>
          <p className="label text-stone">Client care</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>Delivery terms: to be confirmed</li>
            <li>Returns policy: to be confirmed</li>
            <li><Link className="hover:text-bone" href="/admin">Owner sign-in</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-bone/10">
        <p className="mx-auto max-w-7xl px-4 py-6 text-xs text-bone/60 sm:px-8">
          © {new Date().getFullYear()} AVÉRO. Prices shown in Nigerian naira (NGN).
        </p>
      </div>
    </footer>
  );
}
