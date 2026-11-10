"use client";

import Link from "next/link";
import { useId, useMemo, useRef, useState } from "react";
import { useCart } from "@/components/cart/cart-context";
import { categoryLabel, formatNGN, sortSizes } from "@/lib/format";
import type { Product } from "@/lib/types";
import { ConceptBadge, SampleBadge } from "./badges";

/**
 * Native radio stretched invisibly over its styled chip. Applied inline so it
 * can never be lost to a stale or missing stylesheet: no browser circle is
 * ever drawn, yet taps, keyboard and screen readers use the real input.
 */
const HIDDEN_INPUT: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 10,
  width: "100%",
  height: "100%",
  margin: 0,
  padding: 0,
  border: 0,
  opacity: 0,
  WebkitAppearance: "none",
  appearance: "none",
  background: "transparent",
};

/** "Front" / "Back" from the alt text or file name, when the image says so. */
function viewName(img: { alt_text: string; storage_path: string } | undefined) {
  const s = `${img?.alt_text ?? ""} ${img?.storage_path ?? ""}`.toLowerCase();
  if (/\bback\b/.test(s)) return "back";
  if (/\bfront\b/.test(s)) return "front";
  return null;
}

/** Swatch tones for known colour names; anything else falls back to stone. */
const SWATCH: Record<string, string> = {
  black: "#1c1a18",
  brown: "#5a3d2b",
  cream: "#ebe1cc",
  white: "#f8f6f1",
  bone: "#f2ece2",
  stone: "#c6b8a5",
  charcoal: "#3a3936",
  grey: "#8d8a85",
  gray: "#8d8a85",
  navy: "#1f2a3c",
};

export function ProductView({
  product,
  preview = false,
  initialColour,
}: {
  product: Product;
  preview?: boolean;
  initialColour?: string;
}) {
  const { add } = useCart();
  const uid = useId();
  const colours = useMemo(() => [...new Set(product.product_variants.map((v) => v.colour))], [product]);
  const firstInStockColour =
    colours.find((c) => product.product_variants.some((v) => v.colour === c && v.stock > 0)) ?? colours[0];

  const requested = initialColour
    ? colours.find((c) => c.toLowerCase() === initialColour.toLowerCase())
    : undefined;
  const [colour, setColour] = useState<string | undefined>(requested ?? firstInStockColour);
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
  const activeIdx = Math.min(imageIdx, Math.max(images.length - 1, 0));
  const current = images[activeIdx];
  const multi = images.length > 1;
  const nextIdx = (activeIdx + 1) % Math.max(images.length, 1);
  const prevIdx = (activeIdx - 1 + images.length) % Math.max(images.length, 1);
  const nextView = viewName(images[nextIdx]);
  const touchStartX = useRef<number | null>(null);

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
    <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-24 pt-6 sm:px-8 md:grid-cols-12 md:gap-16 md:pb-36 md:pt-10">
      {/* Gallery */}
      <section aria-label="Product images" className="md:col-span-7">
        <div
          className="group relative aspect-square overflow-hidden bg-bone-deep"
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            const start = touchStartX.current;
            touchStartX.current = null;
            const end = e.changedTouches[0]?.clientX;
            if (!multi || start == null || end == null || Math.abs(end - start) < 40) return;
            e.preventDefault(); // a swipe, not a tap
            setImageIdx(end < start ? nextIdx : prevIdx);
          }}
        >
          {images.length ? (
            // All views of this colour are stacked and cross-faded, so flipping
            // to the back is instant (no load after the first visit).
            images.map((img, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.id}
                src={img.url ?? ""}
                alt={i === activeIdx ? img.alt_text || product.name : ""}
                aria-hidden={i === activeIdx ? undefined : true}
                width={img.width ?? 1200}
                height={img.height ?? 1200}
                className={`absolute inset-0 h-full w-full object-cover ${i === activeIdx ? "is-active" : ""}`}
                // Visibility + stacking set inline so the active view always wins,
                // even if a stylesheet is stale or missing.
                style={{
                  opacity: i === activeIdx ? 1 : 0,
                  zIndex: i === activeIdx ? 2 : 1,
                  visibility: i === activeIdx ? "visible" : "hidden",
                  transition: "opacity 400ms ease, visibility 0s linear " + (i === activeIdx ? "0s" : "400ms"),
                }}
                fetchPriority={i === 0 ? "high" : "low"}
                draggable={false}
              />
            ))
          ) : (
            <div className="flex h-full items-center justify-center font-serif text-3xl tracking-[0.28em] text-stone-deep">
              AVÉRO
            </div>
          )}

          {multi && (
            <>
              {/* The whole photo is the control: click / tap shows the next view. */}
              <button
                type="button"
                onClick={() => setImageIdx(nextIdx)}
                className="absolute inset-0 z-10 cursor-pointer focus-visible:outline-offset-[-4px]"
                style={{ position: "absolute", inset: 0, zIndex: 10, background: "transparent", border: 0 }}
                aria-label={nextView ? `Show ${nextView} view` : `Show image ${nextIdx + 1} of ${images.length}`}
              />
              <span
                aria-hidden
                className="label pointer-events-none absolute right-3 top-3 z-20 bg-bone/85 px-2 py-1 text-[10px] text-espresso"
              >
                {viewName(current) ? viewName(current) : `${activeIdx + 1} / ${images.length}`}
              </span>
              <span
                aria-hidden
                className="label pointer-events-none absolute bottom-3 right-3 z-20 bg-espresso/80 px-3 py-1.5 text-[10px] text-bone opacity-90 transition group-hover:opacity-100"
              >
                {nextView ? `Tap to see ${nextView}` : "Tap for next view"}
              </span>
              <button
                type="button"
                onClick={() => setImageIdx(prevIdx)}
                aria-label="Previous image"
                className="absolute left-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center bg-bone/80 text-espresso opacity-0 transition hover:bg-bone focus-visible:opacity-100 group-hover:opacity-100"
              >
                <span aria-hidden>‹</span>
              </button>
              <button
                type="button"
                onClick={() => setImageIdx(nextIdx)}
                aria-label="Next image"
                className="absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center bg-bone/80 text-espresso opacity-0 transition hover:bg-bone focus-visible:opacity-100 group-hover:opacity-100"
              >
                <span aria-hidden>›</span>
              </button>
            </>
          )}
          {current?.is_concept && <ConceptBadge className="pointer-events-none absolute bottom-3 left-3 z-20" />}
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
      <section aria-labelledby={`${uid}-title`} className="md:col-span-5 md:sticky md:top-32 md:self-start md:pt-2">
        <div className="flex flex-wrap gap-2">
          {product.is_demo && <SampleBadge />}
          {preview && (
            <span className="label bg-alert px-2 py-1 text-[10px] text-bone">Preview · {product.status}</span>
          )}
        </div>
        <p className="eyebrow mt-5 text-stone-deep">{categoryLabel(product.category)}</p>
        <h1 id={`${uid}-title`} className="display mt-4 text-5xl sm:text-6xl">
          {product.name}
        </h1>
        <p className="mt-5 font-serif text-2xl font-light text-espresso">{formatNGN(product.price_ngn)}</p>
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
              <legend className="text-[10.5px] uppercase tracking-[0.24em] text-charcoal-soft">
                Colour — <span className="text-espresso">{colour}</span>
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
                        className="peer choice-input"
                        style={HIDDEN_INPUT}
                      />
                      <span className="flex min-h-11 items-center gap-2.5 border border-stone/70 py-1 pl-2 pr-4 text-[10.5px] uppercase tracking-[0.2em] text-charcoal transition hover:border-espresso peer-checked:border-espresso peer-checked:text-espresso peer-checked:shadow-[inset_0_0_0_1px_var(--color-espresso)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-espresso">
                        <span
                          aria-hidden
                          className="block h-6 w-6 rounded-full"
                          style={{
                            background: SWATCH[c.toLowerCase()] ?? "var(--color-stone)",
                            boxShadow: "inset 0 0 0 1px rgba(43,29,20,0.18)",
                          }}
                        />
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
            <legend className="text-[10.5px] uppercase tracking-[0.24em] text-charcoal-soft">
              Size{selected ? <> — <span className="text-espresso">{selected.size}</span></> : null}
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
                      className="peer choice-input"
                        style={HIDDEN_INPUT}
                      aria-describedby={out ? `${uid}-so-${s}` : undefined}
                    />
                    <span
                      className={`flex min-h-12 items-center justify-center border text-[12px] tracking-[0.12em] transition peer-checked:border-espresso peer-checked:bg-espresso peer-checked:text-bone peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-espresso ${
                        out ? "border-stone/40 text-stone-deep line-through" : "border-stone/70 text-charcoal hover:border-espresso"
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

        {product.description && (
          <div className="mt-12 space-y-4 font-serif text-[1.2rem] font-light leading-relaxed text-charcoal">
            {product.description.split(/\n{2,}/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        )}
        <div className="mt-10 border-t hairline">
          <details className="group/d border-b hairline" open>
            <summary className="flex cursor-pointer list-none items-center justify-between py-5 text-[10.5px] uppercase tracking-[0.24em] text-espresso [&::-webkit-details-marker]:hidden">
              <h2 className="font-sans text-[10.5px] font-normal tracking-[0.24em] text-espresso">Details</h2>
              <span aria-hidden className="text-lg font-light transition group-open/d:rotate-45">+</span>
            </summary>
            <div className="pb-6">
              {product.details.length ? (
                <ul className="space-y-2 text-sm text-charcoal-soft">
                  {product.details.map((d, i) => (
                    <li key={i} className="flex gap-3">
                      <span aria-hidden className="mt-[0.7em] block h-px w-3 shrink-0 bg-stone-deep" />
                      {d}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-charcoal-soft">Garment specifications to be confirmed by AVÉRO.</p>
              )}
            </div>
          </details>
          <details className="group/d border-b hairline">
            <summary className="flex cursor-pointer list-none items-center justify-between py-5 [&::-webkit-details-marker]:hidden">
              <h2 className="font-sans text-[10.5px] font-normal uppercase tracking-[0.24em] text-espresso">Delivery &amp; returns</h2>
              <span aria-hidden className="text-lg font-light text-espresso transition group-open/d:rotate-45">+</span>
            </summary>
            <p className="pb-6 text-sm text-charcoal-soft">Delivery options and timelines will be confirmed at launch.</p>
          </details>
        </div>
      </section>
    </div>
  );
}
