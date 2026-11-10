import "server-only";
import { createClient } from "@/lib/supabase/server";
import { IMAGE_BUCKET, SIGNED_URL_TTL_SECONDS } from "@/lib/env";
import { sortSizes } from "@/lib/format";
import type { Product, ProductImage } from "@/lib/types";

const PRODUCT_SELECT =
  "id, slug, name, description, details, category, price_ngn, status, is_demo, featured, version, published_at, created_at, updated_at, product_variants(id, product_id, colour, size, stock, sort_order), product_images(id, product_id, storage_path, alt_text, colour, position, is_cover, is_concept, width, height)";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function normalise(p: Product): Product {
  p.product_variants = [...(p.product_variants ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  p.product_images = [...(p.product_images ?? [])].sort((a, b) => a.position - b.position);
  return p;
}

/**
 * Signs image URLs as the current visitor. Storage RLS decides what can be
 * signed: shoppers only get images of published products; owners get all.
 */
export async function signImages(supabase: SupabaseClient, products: Product[]) {
  const paths = products.flatMap((p) => p.product_images.map((i) => i.storage_path));
  if (paths.length === 0) return products;
  const { data, error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (error) {
    console.error("signImages", error.message);
    return products;
  }
  const byPath = new Map(data.map((d) => [d.path, d.error ? null : d.signedUrl]));
  for (const p of products) {
    for (const img of p.product_images) img.url = byPath.get(img.storage_path) ?? null;
    // Never expose an image the visitor could not sign.
    p.product_images = p.product_images.filter((i) => i.url);
  }
  return products;
}

export type CatalogFilters = {
  category?: string;
  colour?: string;
  size?: string;
  availability?: "in-stock";
  sort?: "newest" | "price-asc" | "price-desc";
};

/** Published products only (RLS also enforces this for shoppers). */
export async function getPublishedProducts(filters: CatalogFilters = {}) {
  const supabase = await createClient();
  let query = supabase.from("products").select(PRODUCT_SELECT).eq("status", "published");
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.sort === "price-asc") query = query.order("price_ngn", { ascending: true });
  else if (filters.sort === "price-desc") query = query.order("price_ngn", { ascending: false });
  else query = query.order("featured", { ascending: false }).order("published_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw new Error(`Could not load products: ${error.message}`);

  let products = (data as unknown as Product[]).map(normalise);
  products = products.filter((p) => {
    const vs = p.product_variants.filter(
      (v) =>
        (!filters.colour || v.colour.toLowerCase() === filters.colour.toLowerCase()) &&
        (!filters.size || v.size === filters.size),
    );
    if ((filters.colour || filters.size) && vs.length === 0) return false;
    if (filters.availability === "in-stock") {
      const pool = filters.colour || filters.size ? vs : p.product_variants;
      if (!pool.some((v) => v.stock > 0)) return false;
    }
    return true;
  });
  return signImages(supabase, products);
}

export async function getFacets() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("category, product_variants(colour, size)")
    .eq("status", "published");
  const categories = new Set<string>();
  const colours = new Set<string>();
  const sizes = new Set<string>();
  for (const p of (data ?? []) as { category: string; product_variants: { colour: string; size: string }[] }[]) {
    categories.add(p.category);
    for (const v of p.product_variants) {
      colours.add(v.colour);
      sizes.add(v.size);
    }
  }
  return {
    categories: [...categories].sort(),
    colours: [...colours].sort(),
    sizes: sortSizes([...sizes]),
  };
}

export async function getPublishedProductBySlug(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error(`Could not load product: ${error.message}`);
  if (!data) return null;
  const [p] = await signImages(supabase, [normalise(data as unknown as Product)]);
  return p;
}

/** Owner-only reads (RLS returns drafts/archived only to owners). */
export async function getProductForOwner(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select(PRODUCT_SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const [p] = await signImages(supabase, [normalise(data as unknown as Product)]);
  return p;
}

export async function listProductsForOwner() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return signImages(supabase, (data as unknown as Product[]).map(normalise));
}

export function coverImage(p: Product, colour?: string | null): ProductImage | undefined {
  const imgs = p.product_images;
  if (colour) {
    const forColour = imgs.filter((i) => i.colour === colour);
    if (forColour.length) return forColour.find((i) => i.is_cover) ?? forColour[0];
  }
  return imgs.find((i) => i.is_cover) ?? imgs[0];
}

export function coloursOf(p: Product) {
  return [...new Set(p.product_variants.map((v) => v.colour))];
}
