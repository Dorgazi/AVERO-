import Link from "next/link";
import { coverImage, listProductsForOwner } from "@/lib/catalog";
import { formatNGN } from "@/lib/format";
import type { ProductStatus } from "@/lib/types";
import { StatusChip } from "@/components/admin/status-chip";

const TABS: { key: ProductStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "published", label: "Published" },
  { key: "archived", label: "Archived" },
];

export default async function AdminProductsPage({ searchParams }: PageProps<"/admin">) {
  const { status } = await searchParams;
  const active = TABS.find((t) => t.key === status)?.key ?? "all";
  const all = await listProductsForOwner();
  const products = active === "all" ? all : all.filter((p) => p.status === active);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Products</h1>
          <p className="mt-1 text-sm text-charcoal-soft">
            Drafts and archived items are private. Only published products appear in the shop.
          </p>
        </div>
        <Link href="/admin/products/new" className="btn btn-primary">New product</Link>
      </div>

      <nav aria-label="Filter by status" className="mt-8 border-b border-stone/60">
        <ul className="flex gap-6">
          {TABS.map((t) => {
            const n = t.key === "all" ? all.length : all.filter((p) => p.status === t.key).length;
            return (
              <li key={t.key}>
                <Link
                  href={t.key === "all" ? "/admin" : `/admin?status=${t.key}`}
                  aria-current={active === t.key ? "page" : undefined}
                  className={`label -mb-px inline-block border-b-2 py-3 ${active === t.key ? "border-espresso text-espresso" : "border-transparent text-charcoal-soft hover:text-espresso"}`}
                >
                  {t.label} ({n})
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {products.length === 0 ? (
        <p className="py-16 text-center text-charcoal-soft">No products here yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Products</caption>
            <thead>
              <tr className="label border-b border-stone/60 text-stone-deep">
                <th scope="col" className="py-3 pr-4 font-normal">Product</th>
                <th scope="col" className="py-3 pr-4 font-normal">Status</th>
                <th scope="col" className="py-3 pr-4 font-normal">Price</th>
                <th scope="col" className="py-3 pr-4 font-normal">Stock</th>
                <th scope="col" className="py-3 font-normal">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone/40">
              {products.map((p) => {
                const cover = coverImage(p);
                const stock = p.product_variants.reduce((n, v) => n + v.stock, 0);
                return (
                  <tr key={p.id}>
                    <td className="py-3 pr-4">
                      <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 hover:underline">
                        <span className="block h-14 w-12 shrink-0 overflow-hidden bg-bone-deep">
                          {cover?.url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={cover.url} alt="" className="h-full w-full object-cover" />
                          )}
                        </span>
                        <span>
                          <span className="font-serif text-lg text-espresso">{p.name}</span>
                          {p.is_demo && <span className="label ml-2 text-[10px] text-stone-deep">Sample</span>}
                        </span>
                      </Link>
                    </td>
                    <td className="py-3 pr-4"><StatusChip status={p.status} /></td>
                    <td className="py-3 pr-4">{formatNGN(p.price_ngn)}</td>
                    <td className={`py-3 pr-4 ${stock === 0 ? "text-alert" : ""}`}>{stock === 0 ? "Sold out" : stock}</td>
                    <td className="py-3 text-charcoal-soft">
                      {new Date(p.updated_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
