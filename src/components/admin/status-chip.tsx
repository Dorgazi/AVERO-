import type { ProductStatus } from "@/lib/types";

export function StatusChip({ status }: { status: ProductStatus }) {
  const styles: Record<ProductStatus, string> = {
    draft: "border-stone text-charcoal",
    published: "border-ok bg-ok text-bone",
    archived: "border-stone-deep text-stone-deep",
  };
  return <span className={`label inline-block border px-2 py-0.5 text-[10px] ${styles[status]}`}>{status}</span>;
}
