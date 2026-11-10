import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getProductForOwner } from "@/lib/catalog";
import { ProductForm } from "@/components/admin/product-form";
import { ImageManager } from "@/components/admin/image-manager";
import { StatusControls } from "@/components/admin/status-controls";
import { StatusChip } from "@/components/admin/status-chip";

export default async function EditProductPage({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  const { created } = await searchParams;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const product = await getProductForOwner(id);
  if (!product) notFound();
  const colours = [...new Set(product.product_variants.map((v) => v.colour))];

  return (
    <div>
      <Link href="/admin" className="label text-charcoal-soft hover:text-espresso">← Products</Link>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-4xl">{product.name}</h1>
        <StatusChip status={product.status} />
        {product.is_demo && <span className="label border border-stone px-2 py-0.5 text-[10px]">Sample</span>}
      </div>
      {created && <p className="mt-3 text-sm text-ok" role="status">Draft created. Add images, then publish when ready.</p>}

      <div className="mt-6">
        <StatusControls product={product} />
      </div>

      <div className="mt-10 grid gap-12 lg:grid-cols-2">
        <section aria-label="Product details">
          <ProductForm product={product} />
        </section>
        <ImageManager productId={product.id} images={product.product_images} colours={colours} />
      </div>
    </div>
  );
}
