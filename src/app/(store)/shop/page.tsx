import type { Metadata } from "next";
import Link from "next/link";
import { getFacets, getPublishedProducts, type CatalogFilters as Filters } from "@/lib/catalog";
import { ProductCard } from "@/components/store/product-card";
import { CatalogFilters } from "@/components/store/catalog-filters";
import { categoryLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Shop" };
export const dynamic = "force-dynamic";

function one(v: string | string[] | undefined) {
  return typeof v === "string" && v.length <= 60 ? v : undefined;
}

export default async function ShopPage({ searchParams }: PageProps<"/shop">) {
  const sp = await searchParams;
  const sortRaw = one(sp.sort);
  const filters: Filters = {
    category: one(sp.category),
    colour: one(sp.colour),
    size: one(sp.size),
    availability: one(sp.availability) === "in-stock" ? "in-stock" : undefined,
    sort: sortRaw === "price-asc" || sortRaw === "price-desc" ? sortRaw : undefined,
  };
  const [products, facets] = await Promise.all([getPublishedProducts(filters), getFacets()]);
  const title = filters.category ? categoryLabel(filters.category) : "All pieces";

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 pt-16 sm:px-8 md:pb-36 md:pt-24">
      <div className="grid gap-6 md:grid-cols-12 md:items-end">
        <div className="md:col-span-8">
          <p className="eyebrow text-stone-deep">Collection 01</p>
          <h1 className="display mt-5 text-6xl sm:text-7xl md:text-8xl">{title}</h1>
        </div>
        <p className="max-w-xs text-sm leading-relaxed text-charcoal-soft md:col-span-4 md:justify-self-end">
          Structured, boxy-fit essentials in a quiet palette, priced in naira.
        </p>
      </div>

      <div className="mt-14 border-y hairline py-5">
        <CatalogFilters
          facets={facets}
          current={{ ...filters, sort: filters.sort }}
          resultCount={products.length}
        />
      </div>

      {products.length ? (
        <ul className="mt-14 grid grid-cols-2 gap-x-4 gap-y-16 sm:gap-x-8 lg:grid-cols-3">
          {products.map((p, i) => (
            <li key={p.id}>
              <ProductCard product={p} priority={i < 2} index={i} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="py-24 text-center">
          <p className="display text-4xl text-espresso">Nothing matches those filters.</p>
          <Link href="/shop" className="label link-underline mt-6 inline-block py-2">
            Clear filters
          </Link>
        </div>
      )}
    </div>
  );
}
