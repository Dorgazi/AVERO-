import Link from "next/link";
import { ProductForm } from "@/components/admin/product-form";

export default function NewProductPage() {
  return (
    <div className="max-w-3xl">
      <Link href="/admin" className="label text-charcoal-soft hover:text-espresso">← Products</Link>
      <h1 className="mt-4 text-4xl">New product</h1>
      <p className="mt-2 text-sm text-charcoal-soft">
        New products start as private drafts. Add images on the next screen, then publish.
      </p>
      <div className="mt-8">
        <ProductForm />
      </div>
    </div>
  );
}
