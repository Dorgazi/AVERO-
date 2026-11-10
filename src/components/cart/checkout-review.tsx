"use client";

import Link from "next/link";
import { formatNGN } from "@/lib/format";
import { useValidatedCart } from "./use-validated-cart";
import { LineIssue } from "./line-issue";

export function CheckoutReview() {
  const { lines, ready, validation, error, checking } = useValidatedCart();

  if (!ready || (lines.length > 0 && !validation && !error)) {
    return <p className="mt-10 text-charcoal-soft" role="status">Checking current prices and stock…</p>;
  }
  if (lines.length === 0) {
    return (
      <div className="mt-12">
        <p className="font-serif text-2xl text-espresso">Your bag is empty.</p>
        <Link href="/shop" className="btn btn-primary mt-8">Continue shopping</Link>
      </div>
    );
  }
  if (error || !validation) {
    return <p className="mt-10 text-alert" role="alert">{error}</p>;
  }

  const blocking = validation.lines.some((l) => l.issue !== "ok" && l.issue !== "price_changed");

  return (
    <div className="mt-10 grid gap-12 md:grid-cols-12">
      <section className="md:col-span-7" aria-labelledby="review-items">
        <h2 id="review-items" className="label text-charcoal">Items</h2>
        <ul className="mt-4 divide-y divide-stone/60 border-y border-stone/60">
          {validation.lines.map((l) => (
            <li key={l.variantId} className="flex justify-between gap-4 py-4 text-sm">
              <div>
                <p className="font-serif text-lg text-espresso">{l.name ?? "Unavailable item"}</p>
                {l.colour && (
                  <p className="text-charcoal-soft">
                    {l.colour} · Size {l.size} · Qty {l.quantityRequested}
                  </p>
                )}
                {l.isDemo && <p className="mt-1 text-xs text-charcoal-soft">Sample product: not for sale</p>}
                <LineIssue line={l} />
              </div>
              <p className="shrink-0 text-espresso">
                {l.unitPriceNgn != null ? formatNGN(l.unitPriceNgn * l.quantityRequested) : "—"}
              </p>
            </li>
          ))}
        </ul>
        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal (checked {checking ? "…" : "just now"})</dt>
            <dd className="text-espresso">{formatNGN(validation.subtotalNgn)}</dd>
          </div>
          <div className="flex justify-between text-charcoal-soft">
            <dt>Delivery</dt>
            <dd>Awaiting delivery rules</dd>
          </div>
        </dl>
      </section>

      <aside className="md:col-span-5" aria-labelledby="payment-title">
        <div className="border border-stone bg-ivory p-6">
          <h2 id="payment-title" className="label text-charcoal">Payment</h2>
          <p className="mt-4 font-serif text-2xl text-espresso">Payments are awaiting setup.</p>
          <p className="mt-3 text-sm text-charcoal-soft">
            Online payment in naira is not yet switched on, so orders can&apos;t be placed here yet. Your bag is
            saved on this device. Nothing has been charged.
          </p>
          {validation.hasDemoItems && (
            <p className="mt-4 text-sm text-alert">
              Your bag contains sample products. Sample products are for demonstration and can never be purchased.
            </p>
          )}
          {blocking && (
            <p className="mt-4 text-sm text-alert">Some items need attention. Return to your bag to update them.</p>
          )}
          <button type="button" className="btn btn-primary mt-6 w-full" disabled aria-describedby="payment-title">
            Pay securely (coming soon)
          </button>
          <Link href="/cart" className="label link-underline mt-4 block py-2 text-center">Back to bag</Link>
        </div>
      </aside>
    </div>
  );
}
