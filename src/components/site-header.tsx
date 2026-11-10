"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/wordmark";
import { useCart } from "@/components/cart/cart-context";

const NAV = [
  { href: "/shop", label: "Shop all" },
  { href: "/shop?category=t-shirts", label: "T-Shirts" },
  { href: "/shop?category=socks", label: "Socks" },
  { href: "/#silhouette", label: "The silhouette" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { count, ready } = useCart();
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Close the menu on navigation.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  // Escape closes; focus moves into the panel and is trapped while open.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const focusables = () =>
      Array.from(panel?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? []);
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      } else if (e.key === "Tab") {
        const els = focusables();
        if (!els.length) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-stone/60 bg-bone/95 backdrop-blur supports-[backdrop-filter]:bg-bone/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8">
        <div className="flex flex-1 items-center">
          <button
            ref={toggleRef}
            type="button"
            className="-ml-2 flex h-11 w-11 items-center justify-center md:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            <span aria-hidden className="relative block h-3 w-5">
              <span className={`absolute left-0 block h-px w-5 bg-espresso transition ${open ? "top-1.5 rotate-45" : "top-0"}`} />
              <span className={`absolute left-0 block h-px w-5 bg-espresso transition ${open ? "top-1.5 -rotate-45" : "top-3"}`} />
            </span>
          </button>
          <nav aria-label="Primary" className="hidden md:block">
            <ul className="flex gap-8">
              {NAV.slice(0, 3).map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="label py-3 text-charcoal hover:text-espresso">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <Wordmark />

        <div className="flex flex-1 items-center justify-end gap-2">
          <Link href="/#silhouette" className="label hidden px-3 py-3 text-charcoal hover:text-espresso md:inline-block">
            Silhouette
          </Link>
          <Link
            href="/cart"
            className="label flex min-h-11 items-center gap-2 px-2 py-3 text-espresso"
            aria-label={ready ? `Cart, ${count} ${count === 1 ? "item" : "items"}` : "Cart"}
          >
            <span>Bag</span>
            <span
              aria-hidden
              className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-espresso px-1.5 text-[11px] tracking-normal"
            >
              {ready ? count : "·"}
            </span>
          </Link>
        </div>
      </div>

      {open && (
        <div
          id="mobile-menu"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="fixed inset-x-0 bottom-0 top-16 z-50 overflow-y-auto bg-bone px-6 pb-10 pt-6 md:hidden"
        >
          <nav aria-label="Mobile">
            <ul className="divide-y divide-stone/60 border-y border-stone/60">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="block py-5 font-serif text-3xl text-espresso" onClick={() => setOpen(false)}>
                    {n.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/cart" className="block py-5 font-serif text-3xl text-espresso" onClick={() => setOpen(false)}>
                  Bag {ready ? `(${count})` : ""}
                </Link>
              </li>
            </ul>
          </nav>
          <p className="label mt-10 text-stone-deep">Lagos · Structured menswear</p>
        </div>
      )}
    </header>
  );
}
