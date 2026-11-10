"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "./cart-context";
import { validateCart, type CartValidation } from "@/lib/cart-validation";

/**
 * Re-checks the persisted cart against Supabase whenever its contents change,
 * syncing stored display prices to the current server price.
 */
export function useValidatedCart() {
  const cart = useCart();
  const [validation, setValidation] = useState<CartValidation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const reqId = useRef(0);

  const key = cart.lines.map((l) => `${l.variantId}:${l.quantity}`).join("|");

  useEffect(() => {
    if (!cart.ready) return;
    const id = ++reqId.current;
    if (cart.lines.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValidation(null);
      return;
    }
    setChecking(true);
    validateCart(
      cart.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, clientPriceNgn: l.priceNgn })),
    )
      .then((v) => {
        if (id !== reqId.current) return;
        setValidation(v);
        setError(null);
        // Keep stored snapshot prices current so the bag shows real prices.
        const changed = cart.lines.some((l) => {
          const vl = v.lines.find((x) => x.variantId === l.variantId);
          return vl?.unitPriceNgn != null && vl.unitPriceNgn !== l.priceNgn;
        });
        if (changed) {
          cart.replace(
            cart.lines.map((l) => {
              const vl = v.lines.find((x) => x.variantId === l.variantId);
              return vl?.unitPriceNgn != null ? { ...l, priceNgn: vl.unitPriceNgn, isDemo: vl.isDemo } : l;
            }),
          );
        }
      })
      .catch(() => {
        if (id === reqId.current) setError("We couldn't confirm current prices and stock. Please try again.");
      })
      .finally(() => {
        if (id === reqId.current) setChecking(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.ready, key]);

  return { ...cart, validation, error, checking };
}
