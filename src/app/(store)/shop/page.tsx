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
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-8 md:py-20">
      <p className="label text-stone-deep">Shop</p>
      <h1 className="mt-3 text-5xl sm:text-6xl">{title}</h1>

      <div className="mt-10 border-y border-stone/60 py-5">
        <CatalogFilters
          facets={facets}
          current={{ ...filters, sort: filters.sort }}
          resultCount={products.length}
        />
      </div>

      {products.length ? (
        <ul className="mt-12 grid grid-cols-2 gap-x-4 gap-y-14 sm:gap-x-6 lg:grid-cols-3">
          {products.map((p, i) => (
            <li key={p.id}>
              <ProductCard product={p} priority={i < 2} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="py-24 text-center">
          <p className="font-serif text-2xl text-espresso">Nothing matches those filters.</p>
          <Link href="/shop" className="label link-underline mt-6 inline-block py-2">
            Clear filters
          </Link>
        </div>
      )}
    </div>
  );
}
