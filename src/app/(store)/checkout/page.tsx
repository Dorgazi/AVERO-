import type { Metadata } from "next";
import { CheckoutReview } from "@/components/cart/checkout-review";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-8 md:py-20">
      <p className="label text-stone-deep">Checkout</p>
      <h1 className="mt-3 text-5xl sm:text-6xl">Review your order</h1>
      <CheckoutReview />
    </div>
  );
}
