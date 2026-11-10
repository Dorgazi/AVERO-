"use client";

import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import { categoryLabel } from "@/lib/format";

type Props = {
  facets: { categories: string[]; colours: string[]; sizes: string[] };
  current: { category?: string; colour?: string; size?: string; availability?: string; sort?: string };
  resultCount: number;
};

/** GET form: works without JavaScript (Apply button); auto-applies with it. */
export function CatalogFilters({ facets, current, resultCount }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  const apply = () => {
    const form = formRef.current;
    if (!form) return;
    const params = new URLSearchParams();
    for (const [k, v] of new FormData(form)) if (typeof v === "string" && v) params.set(k, v);
    startTransition(() => router.replace(`/shop${params.size ? `?${params}` : ""}`, { scroll: false }));
  };

  const select = "field label h-11 min-h-11 cursor-pointer pr-8 text-[11px]";

  return (
    <form
      ref={formRef}
      action="/shop"
      method="get"
      onChange={apply}
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      aria-label="Filter products"
      className="flex flex-wrap items-end gap-3"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="f-category" className="label text-stone-deep">Category</label>
        <select id="f-category" name="category" defaultValue={current.category ?? ""} className={select}>
          <option value="">All</option>
          {facets.categories.map((c) => (
            <option key={c} value={c}>{categoryLabel(c)}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="f-colour" className="label text-stone-deep">Colour</label>
        <select id="f-colour" name="colour" defaultValue={current.colour ?? ""} className={select}>
          <option value="">All</option>
          {facets.colours.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="f-size" className="label text-stone-deep">Size</label>
        <select id="f-size" name="size" defaultValue={current.size ?? ""} className={select}>
          <option value="">All</option>
          {facets.sizes.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="f-sort" className="label text-stone-deep">Sort</label>
        <select id="f-sort" name="sort" defaultValue={current.sort ?? ""} className={select}>
          <option value="">Featured</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
        </select>
      </div>
      <label className="label flex h-11 cursor-pointer items-center gap-2 px-1 text-charcoal">
        <input
          type="checkbox"
          name="availability"
          value="in-stock"
          defaultChecked={current.availability === "in-stock"}
          className="h-4 w-4 accent-espresso"
        />
        In stock only
      </label>
      <noscript>
        <button type="submit" className="btn btn-ghost">Apply</button>
      </noscript>
      <p className="label ml-auto h-11 leading-[44px] text-stone-deep" aria-live="polite">
        {pending ? "Updating…" : `${resultCount} ${resultCount === 1 ? "piece" : "pieces"}`}
      </p>
    </form>
  );
}
