import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublishedProductBySlug } from "@/lib/catalog";
import { ProductView } from "@/components/store/product-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/shop/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPublishedProductBySlug(slug);
  return p ? { title: p.name, description: p.description.slice(0, 160) } : { title: "Not found" };
}

export default async function ProductPage({ params }: PageProps<"/shop/[slug]">) {
  const { slug } = await params;
  const product = await getPublishedProductBySlug(slug);
  if (!product) notFound();

  return (
    <>
      <nav aria-label="Breadcrumb" className="mx-auto max-w-7xl px-4 pt-8 sm:px-8">
        <ol className="label flex gap-2 text-stone-deep">
          <li><Link href="/shop" className="hover:text-espresso">Shop</Link></li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-charcoal">{product.name}</li>
        </ol>
      </nav>
      <ProductView product={product} />
    </>
  );
}
