import Link from "next/link";
import { coloursOf, coverImage } from "@/lib/catalog";
import { formatNGN } from "@/lib/format";
import type { Product } from "@/lib/types";
import { ConceptBadge, SampleBadge } from "./badges";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const cover = coverImage(product);
  const colours = coloursOf(product);
  const soldOut = product.product_variants.every((v) => v.stock <= 0);

  return (
    <article className="group relative">
      <Link href={`/shop/${product.slug}`} className="block focus-visible:outline-offset-4">
        <div className="relative aspect-[4/5] overflow-hidden bg-bone-deep">
          {cover?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover.url}
              alt={cover.alt_text || `${product.name}`}
              width={cover.width ?? 1000}
              height={cover.height ?? 1250}
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full items-center justify-center font-serif text-2xl tracking-[0.28em] text-stone-deep">
              AVÉRO
            </div>
          )}
          <div className="absolute left-3 top-3 flex flex-col items-start gap-1">
            {product.is_demo && <SampleBadge />}
            {soldOut && (
              <span className="label bg-espresso px-2 py-1 text-[10px] text-bone">Sold out</span>
            )}
          </div>
          {cover?.is_concept && <ConceptBadge className="absolute bottom-3 left-3" />}
        </div>
        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-serif text-xl leading-snug">{product.name}</h3>
            <p className="mt-1 text-xs text-charcoal-soft">
              {colours.length} {colours.length === 1 ? "colour" : "colours"}
              {colours.length > 1 ? ` · ${colours.join(", ")}` : ` · ${colours[0] ?? ""}`}
            </p>
          </div>
          <p className="shrink-0 text-sm text-espresso">{formatNGN(product.price_ngn)}</p>
        </div>
      </Link>
    </article>
  );
}
