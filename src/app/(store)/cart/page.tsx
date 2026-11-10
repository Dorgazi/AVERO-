import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";

export const metadata: Metadata = { title: "Your bag" };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-8 md:py-20">
      <p className="eyebrow text-stone-deep">Your selection</p>
      <h1 className="display mt-5 text-6xl sm:text-7xl">Your bag</h1>
      <CartView />
    </div>
  );
}
