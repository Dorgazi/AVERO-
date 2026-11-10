import Link from "next/link";
import { coloursOf, coverImage } from "@/lib/catalog";
import { formatNGN } from "@/lib/format";
import type { Product } from "@/lib/types";
import { ConceptBadge, SampleBadge } from "./badges";

export function ProductCard({
  product,
  priority = false,
  index,
}: {
  product: Product;
  priority?: boolean;
  index?: number;
}) {
  const cover = coverImage(product);
  const colours = coloursOf(product);
  const soldOut = product.product_variants.every((v) => v.stock <= 0);
  // A second view of the same colour (usually the back) revealed on hover.
  const alt = product.product_images.find(
    (i) => i.id !== cover?.id && i.url && (!cover?.colour || i.colour === cover.colour),
  );

  return (
    <article className="group relative">
      <Link href={`/shop/${product.slug}`} className="block focus-visible:outline-offset-4">
        <div className="relative aspect-square overflow-hidden bg-bone-deep">
          {cover?.url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover.url}
                alt={cover.alt_text || `${product.name}`}
                width={cover.width ?? 1000}
                height={cover.height ?? 1250}
                loading={priority ? "eager" : "lazy"}
                fetchPriority={priority ? "high" : "auto"}
                className="h-full w-full object-cover transition duration-[1200ms] ease-out group-hover:scale-[1.03]"
              />
              {alt?.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={alt.url}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-700 ease-out group-hover:opacity-100"
                />
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center font-serif text-2xl tracking-[0.28em] text-stone-deep">
              AVÉRO
            </div>
          )}
          <div className="absolute left-3 top-3 flex flex-col items-start gap-1">
            {product.is_demo && <SampleBadge />}
            {soldOut && <span className="label bg-espresso px-2 py-1 text-[10px] text-bone">Sold out</span>}
          </div>
          {cover?.is_concept && <ConceptBadge className="absolute bottom-3 left-3" />}
        </div>
        <div className="mt-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {index !== undefined && (
              <p aria-hidden className="text-[10px] tracking-[0.24em] text-stone-deep">
                {String(index + 1).padStart(2, "0")}
              </p>
            )}
            <h3 className="mt-1 font-serif text-[1.45rem] font-light leading-tight text-espresso">{product.name}</h3>
            <p className="mt-1.5 text-[10.5px] uppercase tracking-[0.18em] text-charcoal-soft">
              {colours.length > 1 ? `${colours.length} colours` : colours[0] ?? ""}
            </p>
          </div>
          <p className="shrink-0 pt-5 text-[13px] tracking-wide text-espresso">{formatNGN(product.price_ngn)}</p>
        </div>
      </Link>
    </article>
  );
}
