"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { IMAGE_BUCKET, SIGNED_URL_TTL_SECONDS } from "@/lib/env";

const CartInput = z
  .array(
    z.object({
      variantId: z.string().uuid(),
      quantity: z.number().int().min(1).max(10),
    }),
  )
  .max(50);

export type LineIssue =
  | "ok"
  | "price_changed"
  | "insufficient_stock"
  | "sold_out"
  | "unavailable";

export type ValidatedLine = {
  variantId: string;
  productId: string | null;
  slug: string | null;
  name: string | null;
  colour: string | null;
  size: string | null;
  quantityRequested: number;
  quantityAvailable: number;
  unitPriceNgn: number | null;
  clientPriceNgn: number | null;
  isDemo: boolean;
  issue: LineIssue;
  image: string | null;
  imageAlt: string;
};

export type CartValidation = {
  lines: ValidatedLine[];
  subtotalNgn: number;
  hasIssues: boolean;
  hasDemoItems: boolean;
  paymentsConfigured: boolean;
  checkedAt: string;
};

type Row = {
  id: string;
  colour: string;
  size: string;
  stock: number;
  products: {
    id: string;
    slug: string;
    name: string;
    price_ngn: number;
    status: string;
    is_demo: boolean;
    product_images: { storage_path: string; alt_text: string; is_cover: boolean; colour: string | null; position: number }[];
  } | null;
};

/**
 * Re-reads current prices and stock from Supabase for every cart line.
 * Runs as the visitor, so RLS hides anything not published.
 */
export async function validateCart(
  input: { variantId: string; quantity: number; clientPriceNgn?: number }[],
): Promise<CartValidation> {
  const parsed = CartInput.safeParse(input.map(({ variantId, quantity }) => ({ variantId, quantity })));
  if (!parsed.success) throw new Error("Invalid cart");
  const items = parsed.data;
  const clientPrices = new Map(input.map((i) => [i.variantId, i.clientPriceNgn ?? null]));

  const supabase = await createClient();
  const ids = [...new Set(items.map((i) => i.variantId))];
  const { data, error } = ids.length
    ? await supabase
        .from("product_variants")
        .select(
          "id, colour, size, stock, products!inner(id, slug, name, price_ngn, status, is_demo, product_images(storage_path, alt_text, is_cover, colour, position))",
        )
        .in("id", ids)
        .eq("products.status", "published")
    : { data: [] as Row[], error: null };
  if (error) throw new Error(`Could not check cart: ${error.message}`);

  const rows = new Map((data as unknown as Row[]).map((r) => [r.id, r]));

  // Sign one image per line (RLS: published products only).
  const pickImage = (r: Row) => {
    const imgs = [...(r.products?.product_images ?? [])].sort((a, b) => a.position - b.position);
    return imgs.find((i) => i.colour === r.colour) ?? imgs.find((i) => i.is_cover) ?? imgs[0];
  };
  const paths = [...rows.values()].map(pickImage).filter(Boolean).map((i) => i!.storage_path);
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: urls } = await supabase.storage.from(IMAGE_BUCKET).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
    for (const u of urls ?? []) if (u.signedUrl && u.path) signed.set(u.path, u.signedUrl);
  }

  const lines: ValidatedLine[] = items.map((item) => {
    const r = rows.get(item.variantId);
    const clientPrice = clientPrices.get(item.variantId) ?? null;
    if (!r || !r.products) {
      return {
        variantId: item.variantId, productId: null, slug: null, name: null, colour: null, size: null,
        quantityRequested: item.quantity, quantityAvailable: 0, unitPriceNgn: null, clientPriceNgn: clientPrice,
        isDemo: false, issue: "unavailable", image: null, imageAlt: "",
      };
    }
    const p = r.products;
    let issue: LineIssue = "ok";
    if (r.stock <= 0) issue = "sold_out";
    else if (r.stock < item.quantity) issue = "insufficient_stock";
    else if (clientPrice !== null && clientPrice !== p.price_ngn) issue = "price_changed";
    const img = pickImage(r);
    return {
      variantId: r.id, productId: p.id, slug: p.slug, name: p.name, colour: r.colour, size: r.size,
      quantityRequested: item.quantity, quantityAvailable: Math.max(0, r.stock), unitPriceNgn: p.price_ngn,
      clientPriceNgn: clientPrice, isDemo: p.is_demo, issue,
      image: img ? signed.get(img.storage_path) ?? null : null, imageAlt: img?.alt_text ?? p.name,
    };
  });

  const subtotalNgn = lines.reduce(
    (sum, l) => sum + (l.unitPriceNgn ?? 0) * Math.min(l.quantityRequested, l.quantityAvailable),
    0,
  );

  return {
    lines,
    subtotalNgn,
    hasIssues: lines.some((l) => l.issue !== "ok"),
    hasDemoItems: lines.some((l) => l.isDemo),
    // Hosted checkout is not wired up yet. See docs/PAYMENTS.md.
    paymentsConfigured: false,
    checkedAt: new Date().toISOString(),
  };
}
