#!/usr/bin/env node
/**
 * Optional, repeatable demo seed for AVÉRO. Separate from migrations.
 *
 *   npm run seed:demo            # create/refresh sample listings (idempotent)
 *   npm run seed:demo -- --reset # remove ALL sample listings (is_demo = true) and their images
 *   npm run seed:demo -- --refresh-images # re-upload sample photos after changing seed/images
 *
 * Signs in as an owner (SEED_OWNER_EMAIL / SEED_OWNER_PASSWORD, falling back to
 * TEST_OWNER_*), so it uses exactly the same RLS-protected paths as the dashboard.
 * No service-role key is needed. It never modifies a product where is_demo = false.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
config({ path: path.join(root, ".env.local") });
config({ path: path.join(root, ".env.test.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const email = process.env.SEED_OWNER_EMAIL ?? process.env.TEST_OWNER_EMAIL;
const password = process.env.SEED_OWNER_PASSWORD ?? process.env.TEST_OWNER_PASSWORD;
if (!url || !key || !email || !password) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL/PUBLISHABLE_KEY or owner credentials.");
  process.exit(1);
}

const BUCKET = "product-images";
const DEMO_PRICE = 50000; // indicative demo price, ₦50,000, used unless a listing sets its own price
const TEE_SIZES = ["S", "M", "L", "XL", "XXL"];
const tee = "A structured, boxy-fit T-shirt with a roomy body, dropped shoulders and a clean crew neckline.";

/** stock(colour, size) → sample stock; a few zeros demonstrate sold-out states. */
const DEMO = [
  {
    slug: "essential-tee",
    name: "The Essential Tee",
    category: "t-shirts",
    price: 80000, // owner-confirmed price
    featured: true,
    description: `${tee}\n\nThe foundation of the AVÉRO wardrobe, finished with a tonal interlocking AV monogram at the chest and the AVÉRO Essentials mark across the back.`,
    colours: ["Black", "Brown", "Cream", "White"],
    sizes: TEE_SIZES,
    stock: (c, s) => (c === "White" && s === "XXL" ? 0 : c === "Brown" && s === "S" ? 2 : 8),
    images: [
      ["essential-black-front.jpg", "Black", "Black boxy-fit Essential Tee, front view, with a small white AV monogram on the left chest"],
      ["essential-black-back.jpg", "Black", "Black Essential Tee, back view, with the AVÉRO Essentials wordmark across the shoulders"],
      ["essential-brown-front.jpg", "Brown", "Brown boxy-fit Essential Tee, front view, with a cream AV monogram on the left chest"],
      ["essential-brown-back.jpg", "Brown", "Brown Essential Tee, back view, with a cream AVÉRO Essentials wordmark"],
      ["essential-cream-front.jpg", "Cream", "Cream boxy-fit Essential Tee, front view, with a forest-green AV monogram on the left chest"],
      ["essential-cream-back.jpg", "Cream", "Cream Essential Tee, back view, with a forest-green AVÉRO Essentials wordmark across the shoulders"],
      ["essential-white-front.jpg", "White", "White boxy-fit Essential Tee, front view, with a forest-green AV monogram on the left chest"],
      ["essential-white-back.jpg", "White", "White Essential Tee, back view, with a forest-green AVÉRO Essentials wordmark across the shoulders"],
    ],
  },
  {
    slug: "marrakech-tee",
    name: "The Marrakech Tee",
    category: "t-shirts",
    price: 100000, // owner-confirmed price
    featured: true,
    description: `${tee}\n\nA sepia street scene from Marrakech is framed across the chest, with a single cream AV monogram set beneath the collar at the back.`,
    colours: ["Black"],
    sizes: TEE_SIZES,
    stock: () => 8,
    images: [
      ["marrakech-black-front.jpg", "Black", "Black boxy-fit Marrakech Tee, front view, with a framed sepia photograph of a Marrakech street across the chest"],
      ["marrakech-black-back.jpg", "Black", "Black Marrakech Tee, back view, with a small cream AV monogram below the collar"],
    ],
  },
  {
    slug: "training-tee",
    name: "The Training Tee",
    category: "activewear",
    price: 35000, // owner-confirmed price
    featured: false,
    description: "A lightweight training T-shirt with raglan sleeves and a close crew neck, finished with reflective stripes at each cuff.\n\nThe AV monogram sits on the chest and the AVÉRO wordmark across the upper back.",
    colours: ["Black", "Grey"],
    sizes: TEE_SIZES,
    stock: (c, s) => (c === "Grey" && s === "S" ? 0 : 10),
    images: [
      ["training-tee-black-front.jpg", "Black", "Black Training Tee, front view, with raglan sleeves, a white AV monogram on the chest and reflective cuff stripes"],
      ["training-tee-black-back.jpg", "Black", "Black Training Tee, back view, with the AVÉRO wordmark across the upper back"],
      ["training-tee-grey-front.jpg", "Grey", "Grey Training Tee, front view, with raglan sleeves, a white AV monogram on the chest and reflective cuff stripes"],
      ["training-tee-grey-back.jpg", "Grey", "Grey Training Tee, back view, with the AVÉRO wordmark across the upper back"],
    ],
  },
  {
    slug: "training-short",
    name: "The Training Short",
    category: "activewear",
    price: 35000, // owner-confirmed price
    featured: false,
    description: "A lightweight training short with an elastic drawstring waist, side pockets and split hems for easy movement.\n\nFinished with a white AV monogram at the lower left leg.",
    colours: ["Black", "Grey"],
    sizes: TEE_SIZES,
    stock: () => 10,
    images: [
      ["training-short-black-front.jpg", "Black", "Black Training Short, front view, with a drawstring waist, side pockets and a white AV monogram on the left leg"],
      ["training-short-black-back.jpg", "Black", "Black Training Short, back view, with an elastic waistband and split hems"],
      ["training-short-grey-front.jpg", "Grey", "Grey Training Short, front view, with a drawstring waist, side pockets and a white AV monogram on the left leg"],
      ["training-short-grey-back.jpg", "Grey", "Grey Training Short, back view, with an elastic waistband and split hems"],
    ],
  },
  {
    slug: "monogram-ankle-socks",
    name: "Monogram Ankle Socks",
    category: "socks",
    featured: true,
    description: "Ribbed-cuff ankle socks with a dark green AV monogram.",
    colours: ["White"],
    sizes: ["ONE SIZE"],
    stock: () => 12,
    images: [["ankle-sock.jpg", null, "Pair of white ankle socks with a dark green AV monogram on each ribbed cuff"]],
  },
  {
    slug: "monogram-crew-socks",
    name: "Monogram Crew Socks",
    category: "socks",
    featured: true,
    description: "Ribbed crew-length socks with a dark green AV monogram.",
    colours: ["White"],
    sizes: ["ONE SIZE"],
    stock: () => 12,
    images: [["crew-sock.jpg", null, "White crew-length sock with a dark green AV monogram near the top of the ribbed leg"]],
  },
];

const supabase = createClient(url, key, { auth: { persistSession: false } });
const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
if (authErr) {
  console.error("Owner sign-in failed:", authErr.message);
  process.exit(1);
}
const { data: isOwner } = await supabase.rpc("is_owner");
if (!isOwner) {
  console.error(`${email} is not listed in public.owners. See docs/OWNER_SETUP.md.`);
  process.exit(1);
}

const REFRESH_IMAGES = process.argv.includes("--refresh-images");

if (process.argv.includes("--reset")) {
  const { data: demos, error } = await supabase.from("products").select("id, slug, product_images(storage_path)").eq("is_demo", true);
  if (error) throw error;
  for (const p of demos) {
    const paths = p.product_images.map((i) => i.storage_path);
    const { error: delErr } = await supabase.from("products").delete().eq("id", p.id).eq("is_demo", true);
    if (delErr) throw delErr;
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
    console.log(`removed ${p.slug}`);
  }
  console.log("Demo listings removed.");
  process.exit(0);
}

// Remove sample listings that are no longer part of the demo set (sample products only).
{
  const keep = new Set(DEMO.map((d) => d.slug));
  const { data: demos, error } = await supabase.from("products").select("id, slug, product_images(storage_path)").eq("is_demo", true);
  if (error) throw error;
  for (const p of demos.filter((p) => !keep.has(p.slug) && !p.slug.startsWith("test-"))) {
    const paths = p.product_images.map((i) => i.storage_path);
    const { error: delErr } = await supabase.from("products").delete().eq("id", p.id).eq("is_demo", true);
    if (delErr) throw delErr;
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
    console.log(`pruned ${p.slug}`);
  }
}

for (const d of DEMO) {
  let { data: existing } = await supabase.from("products").select("id, is_demo, status, version, featured, price_ngn").eq("slug", d.slug).maybeSingle();
  if (existing && !existing.is_demo) {
    console.log(`skip ${d.slug}: a real (non-sample) product already uses this slug`);
    continue;
  }
  const variants = d.colours.flatMap((c) => d.sizes.map((s) => ({ colour: c, size: s, stock: d.stock(c, s) })));
  if (!existing) {
    const { data, error } = await supabase.rpc("admin_create_product", {
      p_product: { slug: d.slug, name: d.name, category: d.category, description: d.description, details: [], price_ngn: d.price ?? DEMO_PRICE, is_demo: true, featured: d.featured },
      p_variants: variants,
    });
    if (error) throw error;
    existing = { id: data[0].id, is_demo: true, status: "draft", version: 1, featured: d.featured, price_ngn: d.price ?? DEMO_PRICE };
    console.log(`created ${d.slug}`);
  }

  let { data: imgs } = await supabase.from("product_images").select("id, storage_path").eq("product_id", existing.id);
  if (REFRESH_IMAGES) {
    // Replace the sample photos: drop this product's seed images (row first, then object), re-upload below.
    const seeded = (imgs ?? []).filter((i) => i.storage_path.startsWith(`${existing.id}/seed-`));
    for (const img of seeded) {
      const { error: delErr } = await supabase.from("product_images").delete().eq("id", img.id);
      if (delErr) throw delErr;
    }
    if (seeded.length) await supabase.storage.from(BUCKET).remove(seeded.map((i) => i.storage_path));
    imgs = (imgs ?? []).filter((i) => !seeded.includes(i));
  }
  const have = new Set((imgs ?? []).map((i) => i.storage_path));
  for (const [i, [file, colour, alt]] of d.images.entries()) {
    const storagePath = `${existing.id}/seed-${file}`;
    if (have.has(storagePath)) continue;
    const bytes = await readFile(path.join(root, "seed/images", file));
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(storagePath, bytes, { contentType: "image/jpeg", upsert: true });
    if (upErr) throw upErr;
    const { error: insErr } = await supabase.from("product_images").insert({
      product_id: existing.id, storage_path: storagePath, alt_text: alt, colour, position: i + 1, is_concept: true,
    });
    if (insErr) {
      await supabase.storage.from(BUCKET).remove([storagePath]);
      throw insErr;
    }
  }

  const price = d.price ?? DEMO_PRICE;
  if (existing.status !== "published" || existing.featured !== d.featured || existing.price_ngn !== price) {
    const { data: cur } = await supabase.from("products").select("version").eq("id", existing.id).single();
    const { error } = await supabase.rpc("admin_save_product", {
      p_id: existing.id, p_expected_version: cur.version, p_product: { status: "published", featured: d.featured, price_ngn: price }, p_variants: null,
    });
    if (error) throw error;
  }
  console.log(`ready ${d.slug}`);
}
console.log("Demo seed complete.");
