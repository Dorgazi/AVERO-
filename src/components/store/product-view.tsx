"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { useCart } from "@/components/cart/cart-context";
import { formatNGN, sortSizes } from "@/lib/format";
import type { Product } from "@/lib/types";
import { ConceptBadge, SampleBadge } from "./badges";

export function ProductView({ product, preview = false }: { product: Product; preview?: boolean }) {
  const { add } = useCart();
  const uid = useId();
  const colours = useMemo(() => [...new Set(product.product_variants.map((v) => v.colour))], [product]);
  const firstInStockColour =
    colours.find((c) => product.product_variants.some((v) => v.colour === c && v.stock > 0)) ?? colours[0];

  const [colour, setColour] = useState<string | undefined>(firstInStockColour);
  const [size, setSize] = useState<string | undefined>(undefined);
  const [imageIdx, setImageIdx] = useState(0);
  const [status, setStatus] = useState<{ kind: "added" | "error"; text: string } | null>(null);

  const variantsForColour = product.product_variants.filter((v) => v.colour === colour);
  const sizes = sortSizes(variantsForColour.map((v) => v.size));
  const selected = variantsForColour.find((v) => v.size === size);
  const colourSoldOut = variantsForColour.every((v) => v.stock <= 0);
  const allSoldOut = product.product_variants.every((v) => v.stock <= 0);

  const images = useMemo(() => {
    const forColour = product.product_images.filter((i) => !i.colour || i.colour === colour);
    return forColour.length ? forColour : product.product_images;
  }, [product.product_images, colour]);
  const current = images[Math.min(imageIdx, images.length - 1)];

  const onAdd = () => {
    if (preview) {
      setStatus({ kind: "error", text: "Preview mode: adding to bag is disabled." });
      return;
    }
    if (!selected) {
      setStatus({ kind: "error", text: "Please choose a size." });
      return;
    }
    if (selected.stock <= 0) {
      setStatus({ kind: "error", text: "That size is sold out." });
      return;
    }
    const img = images[0];
    add({
      variantId: selected.id,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      colour: selected.colour,
      size: selected.size,
      priceNgn: product.price_ngn,
      image: img?.url ?? null,
      imageAlt: img?.alt_text ?? product.name,
      isDemo: product.is_demo,
    });
    setStatus({ kind: "added", text: `${product.name}, ${selected.colour}, size ${selected.size} added to your bag.` });
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-8 md:grid-cols-12 md:gap-16 md:py-16">
      {/* Gallery */}
      <section aria-label="Product images" className="md:col-span-7">
        <div className="relative aspect-square overflow-hidden bg-bone-deep">
          {current?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={current.id}
              src={current.url}
              alt={current.alt_text || product.name}
              width={current.width ?? 1200}
              height={current.height ?? 1200}
              className="h-full w-full object-cover"
              fetchPriority="high"
            />
          ) : (
            <div className="flex h-full items-center justify-center font-serif text-3xl tracking-[0.28em] text-stone-deep">
              AVÉRO
            </div>
          )}
          {current?.is_concept && <ConceptBadge className="absolute bottom-3 left-3" />}
        </div>
        {images.length > 1 && (
          <ul className="mt-3 grid grid-cols-5 gap-2" aria-label="Choose image">
            {images.map((img, i) => (
              <li key={img.id}>
                <button
                  type="button"
                  onClick={() => setImageIdx(i)}
                  aria-label={`Show image ${i + 1} of ${images.length}${img.alt_text ? `: ${img.alt_text}` : ""}`}
                  aria-current={i === imageIdx ? "true" : undefined}
                  className={`block aspect-square w-full overflow-hidden border ${
                    i === imageIdx ? "border-espresso" : "border-transparent opacity-80 hover:opacity-100"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url ?? ""} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Details + purchase */}
      <section aria-labelledby={`${uid}-title`} className="md:col-span-5 md:pt-4">
        <div className="flex flex-wrap gap-2">
          {product.is_demo && <SampleBadge />}
          {preview && (
            <span className="label bg-alert px-2 py-1 text-[10px] text-bone">Preview · {product.status}</span>
          )}
        </div>
        <h1 id={`${uid}-title`} className="mt-4 text-4xl sm:text-5xl">
          {product.name}
        </h1>
        <p className="mt-4 text-lg text-espresso">{formatNGN(product.price_ngn)}</p>
        {product.is_demo && (
          <p className="mt-2 text-xs text-charcoal-soft">
            Indicative sample price. Final pricing, stock and specifications will be confirmed by AVÉRO.
          </p>
        )}

        <form
          className="mt-10 space-y-8"
          onSubmit={(e) => {
            e.preventDefault();
            onAdd();
          }}
        >
          {colours.length > 0 && (
            <fieldset>
              <legend className="label text-charcoal">
                Colour: <span className="text-espresso">{colour}</span>
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {colours.map((c) => {
                  const soldOut = product.product_variants.filter((v) => v.colour === c).every((v) => v.stock <= 0);
                  return (
                    <label key={c} className="relative cursor-pointer">
                      <input
                        type="radio"
                        name="colour"
                        value={c}
                        checked={colour === c}
                        onChange={() => {
                          setColour(c);
                          setImageIdx(0);
                          setStatus(null);
                          const stillValid = product.product_variants.find(
                            (v) => v.colour === c && v.size === size && v.stock > 0,
                          );
                          if (!stillValid) setSize(undefined);
                        }}
                        className="peer sr-only"
                      />
                      <span className="label flex min-h-11 items-center border border-stone px-4 text-[11px] text-charcoal transition peer-checked:border-espresso peer-checked:bg-espresso peer-checked:text-bone peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-espresso">
                        {c}
                        {soldOut && <span className="ml-2 normal-case tracking-normal opacity-70">(sold out)</span>}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          <fieldset>
            <legend className="label text-charcoal">
              Size{selected ? <>: <span className="text-espresso">{selected.size}</span></> : null}
            </legend>
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
              {sizes.map((s) => {
                const v = variantsForColour.find((x) => x.size === s)!;
                const out = v.stock <= 0;
                return (
                  <label key={s} className={`relative ${out ? "cursor-not-allowed" : "cursor-pointer"}`}>
                    <input
                      type="radio"
                      name="size"
                      value={s}
                      checked={size === s}
                      disabled={out}
                      onChange={() => {
                        setSize(s);
                        setStatus(null);
                      }}
                      className="peer sr-only"
                      aria-describedby={out ? `${uid}-so-${s}` : undefined}
                    />
                    <span
                      className={`flex min-h-12 items-center justify-center border text-sm transition peer-checked:border-espresso peer-checked:bg-espresso peer-checked:text-bone peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-espresso ${
                        out ? "border-stone/50 text-stone-deep line-through" : "border-stone text-charcoal hover:border-espresso"
                      }`}
                    >
                      {s}
                    </span>
                    {out && (
                      <span id={`${uid}-so-${s}`} className="sr-only">
                        Sold out
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
            {selected && selected.stock > 0 && selected.stock <= 3 && (
              <p className="mt-3 text-xs text-alert">Only {selected.stock} left in this size.</p>
            )}
            {product.is_demo && <p className="mt-3 text-xs text-charcoal-soft">Stock shown is sample stock.</p>}
          </fieldset>

          <div>
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={allSoldOut || colourSoldOut}
            >
              {allSoldOut ? "Sold out" : colourSoldOut ? `Sold out in ${colour}` : "Add to bag"}
            </button>
            <div aria-live="polite" role="status" className="mt-3 min-h-6 text-sm">
              {status && (
                <p className={status.kind === "error" ? "text-alert" : "text-ok"}>
                  {status.text}{" "}
                  {status.kind === "added" && (
                    <Link href="/cart" className="link-underline text-espresso">
                      View bag
                    </Link>
                  )}
                </p>
              )}
            </div>
          </div>
        </form>

        <div className="mt-10 space-y-6 border-t border-stone/60 pt-8">
          {product.description && (
            <div className="space-y-3 text-charcoal-soft">
              {product.description.split(/\n{2,}/).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          )}
          <div>
            <h2 className="label text-charcoal">Details</h2>
            {product.details.length ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-charcoal-soft">
                {product.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-charcoal-soft">Garment specifications to be confirmed by AVÉRO.</p>
            )}
          </div>
          <div>
            <h2 className="label text-charcoal">Delivery</h2>
            <p className="mt-3 text-sm text-charcoal-soft">Delivery options and timelines will be confirmed at launch.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
