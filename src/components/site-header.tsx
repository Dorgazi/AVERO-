"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/wordmark";
import { useCart } from "@/components/cart/cart-context";

const NAV = [
  { href: "/shop", label: "Shop all" },
  { href: "/shop?category=t-shirts", label: "T-Shirts" },
  { href: "/shop?category=activewear", label: "Activewear" },
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
    <header className="sticky top-0 z-40 border-b hairline bg-bone/90 backdrop-blur-md supports-[backdrop-filter]:bg-bone/75">
      <div className="hidden bg-espresso text-bone/80 md:block">
        <p className="mx-auto max-w-7xl px-8 py-2 text-center text-[10px] uppercase tracking-[0.34em]">
          Collection 01 &nbsp;·&nbsp; Structured menswear from Lagos
        </p>
      </div>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8 md:h-20">
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
            <span aria-hidden className="relative block h-3 w-6">
              <span className={`absolute left-0 block h-px w-6 bg-espresso transition duration-300 ${open ? "top-1.5 rotate-45" : "top-0"}`} />
              <span className={`absolute left-0 block h-px bg-espresso transition-all duration-300 ${open ? "top-1.5 w-6 -rotate-45" : "top-3 w-4"}`} />
            </span>
          </button>
          <nav aria-label="Primary" className="hidden md:block">
            <ul className="flex gap-9">
              {NAV.slice(0, 4).map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="link-draw text-[10.5px] uppercase tracking-[0.26em] text-charcoal hover:text-espresso">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <Wordmark />

        <div className="flex flex-1 items-center justify-end gap-6">
          <Link
            href="/#silhouette"
            className="link-draw hidden text-[10.5px] uppercase tracking-[0.26em] text-charcoal hover:text-espresso md:inline-block"
          >
            The silhouette
          </Link>
          <Link
            href="/cart"
            className="flex min-h-11 items-center gap-2 text-[10.5px] uppercase tracking-[0.26em] text-espresso"
            aria-label={ready ? `Cart, ${count} ${count === 1 ? "item" : "items"}` : "Cart"}
          >
            <span className="link-draw">Bag</span>
            <span aria-hidden className="font-serif text-base italic tracking-normal normal-case">
              ({ready ? count : "·"})
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
          className="fixed inset-x-0 bottom-0 top-16 z-50 flex flex-col overflow-y-auto bg-bone px-6 pb-10 pt-8 md:hidden"
        >
          <nav aria-label="Mobile">
            <ul>
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="flex items-baseline gap-4 py-3 font-serif text-[2.6rem] font-light leading-tight text-espresso" onClick={() => setOpen(false)}>
                    <span aria-hidden className="font-sans text-[10px] tracking-[0.2em] text-stone-deep">0{NAV.indexOf(n) + 1}</span>
                    {n.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/cart" className="flex items-baseline gap-4 py-3 font-serif text-[2.6rem] font-light leading-tight text-espresso" onClick={() => setOpen(false)}>
                  <span aria-hidden className="font-sans text-[10px] tracking-[0.2em] text-stone-deep">0{NAV.length + 1}</span>
                  Bag {ready ? `(${count})` : ""}
                </Link>
              </li>
            </ul>
          </nav>
          <p className="eyebrow mt-auto pt-10 text-stone-deep">Lagos · Structured menswear</p>
        </div>
      )}
    </header>
  );
}
