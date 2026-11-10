import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getProductForOwner } from "@/lib/catalog";
import { ProductView } from "@/components/store/product-view";

/** Owner-only preview of a product in any status, rendered with storefront styling. */
export default async function PreviewPage({ params }: PageProps<"/admin/products/[id]/preview">) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const product = await getProductForOwner(id);
  if (!product) notFound();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border border-alert/40 bg-alert/5 px-4 py-3 text-sm text-alert">
        <p>
          Preview of a <strong>{product.status}</strong> product. Only owners can see this page.
        </p>
        <Link href={`/admin/products/${product.id}`} className="label link-underline py-2">Back to editor</Link>
      </div>
      <div className="-mx-4 mt-6 bg-bone sm:-mx-8">
        <ProductView product={product} preview />
      </div>
    </div>
  );
}
