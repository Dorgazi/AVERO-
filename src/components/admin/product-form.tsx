"use client";

import { useActionState, useState } from "react";
import { createProduct, saveProduct, type ActionResult } from "@/app/admin/actions";
import { slugify } from "@/lib/format";
import type { Product } from "@/lib/types";
import { VariantEditor } from "./variant-editor";

export function ProductForm({ product }: { product?: Product }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    product ? saveProduct : createProduct,
    null,
  );
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(product));

  // The version this form is editing. Advances only after our own successful save.
  const version = state?.ok && state.version ? Math.max(state.version, product?.version ?? 0) : product?.version;

  return (
    <form action={action} className="space-y-8" noValidate>
      {product && (
        <>
          <input type="hidden" name="id" value={product.id} />
          <input type="hidden" name="version" value={version} />
        </>
      )}

      <div aria-live="polite">
        {state && !state.ok && (
          <div role="alert" className="border border-alert/50 bg-alert/5 p-4 text-sm text-alert">
            <p>{state.error}</p>
            {state.code === "stale" && (
              <button type="button" className="btn btn-ghost mt-3 min-h-10" onClick={() => window.location.reload()}>
                Reload latest version
              </button>
            )}
          </div>
        )}
        {state?.ok && <p className="border border-ok/40 bg-ok/5 p-3 text-sm text-ok">{state.message ?? "Saved."}</p>}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="name" className="label text-charcoal">Name</label>
          <input
            id="name"
            name="name"
            required
            maxLength={120}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            className="field mt-2"
          />
        </div>
        <div>
          <label htmlFor="slug" className="label text-charcoal">URL slug</label>
          <input
            id="slug"
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
            maxLength={80}
            aria-describedby="slug-hint"
            className="field mt-2"
          />
          <p id="slug-hint" className="mt-1 text-xs text-charcoal-soft">/shop/{slug || "…"}</p>
        </div>
        <div>
          <label htmlFor="category" className="label text-charcoal">Category</label>
          <input
            id="category"
            name="category"
            list="category-options"
            defaultValue={product?.category ?? "t-shirts"}
            className="field mt-2"
          />
          <datalist id="category-options">
            <option value="t-shirts" />
            <option value="socks" />
            <option value="activewear" />
          </datalist>
        </div>
        <div>
          <label htmlFor="price_ngn" className="label text-charcoal">Price (₦, whole naira)</label>
          <div className="relative mt-2">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-soft" aria-hidden>₦</span>
            <input
              id="price_ngn"
              name="price_ngn"
              inputMode="numeric"
              required
              defaultValue={product ? String(product.price_ngn) : ""}
              aria-describedby="price-hint"
              className="field pl-7"
            />
          </div>
          <p id="price-hint" className="mt-1 text-xs text-charcoal-soft">No kobo. Commas are fine, e.g. 50,000.</p>
        </div>
        <div className="flex flex-col justify-end gap-3">
          <label className="flex min-h-10 items-center gap-3 text-sm">
            <input type="checkbox" name="featured" defaultChecked={product?.featured} className="h-4 w-4 accent-espresso" />
            Feature on homepage
          </label>
          <label className="flex min-h-10 items-center gap-3 text-sm">
            <input type="checkbox" name="is_demo" defaultChecked={product?.is_demo ?? false} className="h-4 w-4 accent-espresso" />
            Sample product (labelled; never sold)
          </label>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="description" className="label text-charcoal">Description</label>
          <textarea
            id="description"
            name="description"
            rows={5}
            maxLength={4000}
            defaultValue={product?.description ?? ""}
            className="field mt-2"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="details" className="label text-charcoal">Garment details (one per line)</label>
          <textarea
            id="details"
            name="details"
            rows={4}
            defaultValue={product?.details.join("\n") ?? ""}
            placeholder={"e.g. 100% cotton, 240 gsm\nMade in Lagos"}
            className="field mt-2"
          />
        </div>
      </div>

      <VariantEditor initial={product?.product_variants ?? []} />

      <div className="flex flex-wrap items-center gap-3 border-t border-stone/60 pt-6">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : product ? "Save changes" : "Create draft"}
        </button>
        {product && <span className="text-xs text-charcoal-soft">Editing version {version}</span>}
      </div>
    </form>
  );
}
