export type ProductStatus = "draft" | "published" | "archived";

export type Variant = {
  id: string;
  product_id: string;
  colour: string;
  size: string;
  stock: number;
  sort_order: number;
};

export type ProductImage = {
  id: string;
  product_id: string;
  storage_path: string;
  alt_text: string;
  colour: string | null;
  position: number;
  is_cover: boolean;
  is_concept: boolean;
  width: number | null;
  height: number | null;
  url?: string | null;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  details: string[];
  category: string;
  price_ngn: number;
  status: ProductStatus;
  is_demo: boolean;
  featured: boolean;
  version: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  product_variants: Variant[];
  product_images: ProductImage[];
};

/** Cart line as stored in the browser. Price is a display snapshot only;
 * the server re-reads price and stock from Supabase before checkout. */
export type CartLine = {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  colour: string;
  size: string;
  priceNgn: number;
  quantity: number;
  image: string | null;
  imageAlt: string;
  isDemo: boolean;
};
