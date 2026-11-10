"use client";

import Link from "next/link";
import { formatNGN } from "@/lib/format";
import { MAX_LINE_QTY } from "./cart-context";
import { useValidatedCart } from "./use-validated-cart";
import { LineIssue } from "./line-issue";
import { SampleBadge } from "@/components/store/badges";

export function CartView() {
  const { lines, ready, setQuantity, remove, validation, error, checking } = useValidatedCart();

  if (!ready) {
    return <p className="mt-10 text-charcoal-soft" role="status">Loading your bag…</p>;
  }

  if (lines.length === 0) {
    return (
      <div className="mt-12 border-t border-stone/60 pt-12">
        <p className="font-serif text-2xl text-espresso">Your bag is empty.</p>
        <Link href="/shop" className="btn btn-primary mt-8">Continue shopping</Link>
      </div>
    );
  }

  const blocking = validation?.lines.some((l) => l.issue !== "ok" && l.issue !== "price_changed");

  return (
    <div className="mt-10 grid gap-12 md:grid-cols-12">
      <ul className="divide-y divide-stone/60 border-y border-stone/60 md:col-span-8" aria-label="Items in your bag">
        {lines.map((l) => {
          const v = validation?.lines.find((x) => x.variantId === l.variantId);
          const maxQty = Math.min(MAX_LINE_QTY, v ? Math.max(v.quantityAvailable, 1) : MAX_LINE_QTY);
          return (
            <li key={l.variantId} className="flex gap-4 py-6 sm:gap-6">
              <Link href={`/shop/${l.slug}`} className="block w-24 shrink-0 sm:w-28">
                <div className="aspect-[4/5] overflow-hidden bg-bone-deep">
                  {(v?.image ?? l.image) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v?.image ?? l.image ?? ""} alt={l.imageAlt || l.name} className="h-full w-full object-cover" />
                  )}
                </div>
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-serif text-xl leading-snug">
                      <Link href={`/shop/${l.slug}`} className="hover:underline">{l.name}</Link>
                    </h2>
                    <p className="mt-1 text-sm text-charcoal-soft">
                      {l.colour} · Size {l.size}
                    </p>
                    {l.isDemo && <SampleBadge className="mt-2" />}
                  </div>
                  <p className="shrink-0 text-sm text-espresso">{formatNGN(l.priceNgn * l.quantity)}</p>
                </div>
                <LineIssue line={v} />
                <div className="mt-auto flex items-center justify-between pt-4">
                  <div className="flex items-center border border-stone" role="group" aria-label={`Quantity for ${l.name}`}>
                    <button
                      type="button"
                      className="flex h-11 w-11 items-center justify-center text-lg disabled:opacity-40"
                      onClick={() => setQuantity(l.variantId, l.quantity - 1)}
                      aria-label={`Decrease quantity of ${l.name}`}
                      disabled={l.quantity <= 1}
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm" aria-live="polite" aria-label={`Quantity ${l.quantity}`}>
                      {l.quantity}
                    </span>
                    <button
                      type="button"
                      className="flex h-11 w-11 items-center justify-center text-lg disabled:opacity-40"
                      onClick={() => setQuantity(l.variantId, l.quantity + 1)}
                      aria-label={`Increase quantity of ${l.name}`}
                      disabled={l.quantity >= maxQty}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(l.variantId)}
                    className="label link-underline min-h-11 px-2 text-charcoal hover:text-espresso"
                    aria-label={`Remove ${l.name}, ${l.colour}, size ${l.size}`}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <aside className="md:col-span-4" aria-label="Order summary">
        <div className="bg-bone-deep p-6">
          <h2 className="label text-charcoal">Summary</h2>
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="text-espresso">{formatNGN(validation?.subtotalNgn ?? lines.reduce((n, l) => n + l.priceNgn * l.quantity, 0))}</dd>
            </div>
            <div className="flex justify-between text-charcoal-soft">
              <dt>Delivery</dt>
              <dd>Confirmed at checkout</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-charcoal-soft" role="status" aria-live="polite">
            {checking ? "Checking current prices and stock…" : validation ? "Prices and stock checked just now." : ""}
          </p>
          {error && <p className="mt-2 text-xs text-alert" role="alert">{error}</p>}
          {blocking ? (
            <p className="mt-6 text-sm text-alert">Please resolve the items marked above to continue.</p>
          ) : null}
          <Link
            href={blocking ? "#" : "/checkout"}
            aria-disabled={blocking ? "true" : undefined}
            onClick={(e) => blocking && e.preventDefault()}
            className="btn btn-primary mt-6 w-full"
          >
            Review order
          </Link>
          <Link href="/shop" className="label link-underline mt-4 block py-2 text-center">Continue shopping</Link>
        </div>
      </aside>
    </div>
  );
}
