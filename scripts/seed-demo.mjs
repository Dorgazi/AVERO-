#!/usr/bin/env node
/**
 * Optional, repeatable demo seed for AVÉRO. Separate from migrations.
 *
 *   npm run seed:demo            # create/refresh sample listings (idempotent)
 *   npm run seed:demo -- --reset # remove ALL sample listings (is_demo = true) and their images
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
const DEMO_PRICE = 50000; // the single indicative demo price, ₦50,000
const TEE_SIZES = ["S", "M", "L", "XL", "XXL"];
const tee = "A structured, boxy-fit T-shirt with a roomy body, dropped shoulders and a clean crew neckline.";

/** stock(colour, size) → sample stock; a few zeros demonstrate sold-out states. */
const DEMO = [
  {
    slug: "essential-tee",
    name: "The Essential Tee",
    category: "t-shirts",
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
    slug: "heritage-script-tee",
    name: "Heritage Script Tee",
    category: "t-shirts",
    featured: true,
    description: `${tee}\n\nA varsity-style Avéro script sweeps across the chest above a small chequered flag.`,
    colours: ["Forest"],
    sizes: TEE_SIZES,
    stock: (_c, s) => (s === "XXL" ? 0 : 6),
    images: [
      ["heritage-script-front.jpg", null, "Forest green boxy T-shirt, front view, with a cream Avéro script logo and chequered flag across the chest"],
      ["heritage-script-back.jpg", null, "Forest green Heritage Script Tee, plain back view"],
    ],
  },
  {
    slug: "snapshot-tee",
    name: "Snapshot Tee",
    category: "t-shirts",
    featured: true,
    description: `${tee}\n\nA line-drawn camera and AVÉRO wordmark, small on the chest and large across the back.`,
    colours: ["Rust"],
    sizes: TEE_SIZES,
    stock: () => 5,
    images: [
      ["snapshot-front.jpg", null, "Rust boxy T-shirt, front view, with a small cream camera illustration and AVÉRO wordmark on the chest"],
      ["snapshot-back.jpg", null, "Rust Snapshot Tee, back view, with a large cream camera illustration above the AVÉRO wordmark"],
    ],
  },
  {
    slug: "open-road-tee",
    name: "Open Road Tee",
    category: "t-shirts",
    featured: true,
    description: `${tee}\n\nA camper van beneath mountains and a low orange sun, set above the AVÉRO wordmark.`,
    colours: ["Bone"],
    sizes: TEE_SIZES,
    stock: () => 7,
    images: [
      ["open-road-front.jpg", null, "Bone boxy T-shirt, front view, with a camper van, mountains and orange sun printed above the AVÉRO wordmark"],
      ["open-road-back.jpg", null, "Bone Open Road Tee, plain back view"],
    ],
  },
  {
    slug: "digital-nostalgia-tee",
    name: "Digital Nostalgia Tee",
    category: "t-shirts",
    featured: false,
    description: `${tee}\n\nA vintage desktop computer above the AVÉRO wordmark and Est. 2026.`,
    colours: ["Lilac"],
    sizes: TEE_SIZES,
    stock: (_c, s) => (s === "S" ? 0 : 4),
    images: [
      ["digital-nostalgia-front.jpg", null, "Lilac boxy T-shirt, front view, with a retro computer illustration above AVÉRO Est. 2026"],
      ["digital-nostalgia-back.jpg", null, "Lilac Digital Nostalgia Tee, plain back view"],
    ],
  },
  {
    slug: "lucky-eight-tee",
    name: "Lucky Eight Tee",
    category: "t-shirts",
    featured: false,
    description: `${tee}\n\nA cream eight-ball emblem above the AVÉRO wordmark.`,
    colours: ["Black"],
    sizes: TEE_SIZES,
    stock: () => 6,
    images: [
      ["lucky-eight-front.jpg", null, "Black boxy T-shirt, front view, with a cream eight-ball emblem above the AVÉRO wordmark"],
      ["lucky-eight-back.jpg", null, "Black Lucky Eight Tee, plain back view"],
    ],
  },
  {
    slug: "retro-cassette-tee",
    name: "Retro Cassette Tee",
    category: "t-shirts",
    featured: false,
    description: `${tee}\n\nA striped cassette tape between the AVÉRO wordmark and Est. 2026.`,
    colours: ["Washed Charcoal"],
    sizes: TEE_SIZES,
    stock: () => 0, // demonstrates a fully sold-out listing
    images: [
      ["retro-cassette-front.jpg", null, "Washed charcoal boxy T-shirt, front view, with a striped cassette tape graphic between AVÉRO and Est. 2026"],
      ["retro-cassette-back.jpg", null, "Washed charcoal Retro Cassette Tee, plain back view"],
    ],
  },
  {
    slug: "monogram-ankle-socks",
    name: "Monogram Ankle Socks",
    category: "socks",
    featured: false,
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
    featured: false,
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

for (const d of DEMO) {
  let { data: existing } = await supabase.from("products").select("id, is_demo, status, version").eq("slug", d.slug).maybeSingle();
  if (existing && !existing.is_demo) {
    console.log(`skip ${d.slug}: a real (non-sample) product already uses this slug`);
    continue;
  }
  const variants = d.colours.flatMap((c) => d.sizes.map((s) => ({ colour: c, size: s, stock: d.stock(c, s) })));
  if (!existing) {
    const { data, error } = await supabase.rpc("admin_create_product", {
      p_product: { slug: d.slug, name: d.name, category: d.category, description: d.description, details: [], price_ngn: DEMO_PRICE, is_demo: true, featured: d.featured },
      p_variants: variants,
    });
    if (error) throw error;
    existing = { id: data[0].id, is_demo: true, status: "draft", version: 1 };
    console.log(`created ${d.slug}`);
  }

  const { data: imgs } = await supabase.from("product_images").select("storage_path").eq("product_id", existing.id);
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

  if (existing.status !== "published") {
    const { data: cur } = await supabase.from("products").select("version").eq("id", existing.id).single();
    const { error } = await supabase.rpc("admin_save_product", {
      p_id: existing.id, p_expected_version: cur.version, p_product: { status: "published" }, p_variants: null,
    });
    if (error) throw error;
  }
  console.log(`ready ${d.slug}`);
}
console.log("Demo seed complete.");
