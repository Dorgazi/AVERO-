const ngn = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

/** Whole-naira price, e.g. ₦50,000 */
export function formatNGN(amount: number): string {
  return ngn.format(amount).replace("NGN", "₦").replace(/ /g, "");
}

export const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "ONE SIZE"] as const;
export type Size = (typeof SIZE_ORDER)[number];

export function sortSizes<T extends string>(sizes: T[]): T[] {
  return [...sizes].sort(
    (a, b) => SIZE_ORDER.indexOf(a as Size) - SIZE_ORDER.indexOf(b as Size),
  );
}

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const CATEGORY_LABELS: Record<string, string> = {
  "t-shirts": "T-Shirts",
  socks: "Socks",
  activewear: "Activewear",
};
export function categoryLabel(c: string) {
  return CATEGORY_LABELS[c] ?? c.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}
