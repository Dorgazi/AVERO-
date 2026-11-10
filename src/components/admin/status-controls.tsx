"use client";

import Link from "next/link";
import { useActionState } from "react";
import { setProductStatus, type ActionResult } from "@/app/admin/actions";
import type { Product } from "@/lib/types";

export function StatusControls({ product }: { product: Product }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(setProductStatus, null);

  const button = (status: Product["status"], label: string, primary = false) => (
    <form action={action}>
      <input type="hidden" name="id" value={product.id} />
      <input type="hidden" name="version" value={product.version} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" disabled={pending} className={`btn ${primary ? "btn-primary" : "btn-ghost"} min-h-10`}>
        {label}
      </button>
    </form>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/admin/products/${product.id}/preview`} className="btn btn-ghost min-h-10">
          Preview
        </Link>
        {product.status !== "published" && button("published", "Publish", true)}
        {product.status === "published" && button("draft", "Unpublish")}
        {product.status !== "archived" && button("archived", "Archive")}
        {product.status === "archived" && button("draft", "Restore to drafts")}
        {product.status === "published" && (
          <Link href={`/shop/${product.slug}`} className="label link-underline ml-2 py-2 text-charcoal">
            View live ↗
          </Link>
        )}
      </div>
      <div aria-live="polite" className="mt-2 min-h-5 text-sm">
        {state && !state.ok && (
          <p role="alert" className="text-alert">
            {state.error}{" "}
            {state.code === "stale" && (
              <button type="button" className="link-underline" onClick={() => window.location.reload()}>Reload</button>
            )}
          </p>
        )}
        {state?.ok && <p className="text-ok">{state.message}</p>}
      </div>
    </div>
  );
}
