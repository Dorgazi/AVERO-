import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
import { getOwner } from "@/lib/auth";
import { ALLOWED_IMAGE_TYPES, IMAGE_BUCKET, MAX_IMAGE_BYTES } from "@/lib/env";

export const runtime = "nodejs";

const EXT: Record<(typeof ALLOWED_IMAGE_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/** Detect the real type from magic bytes, never trusting the client's MIME. */
function sniff(buf: Buffer): (typeof ALLOWED_IMAGE_TYPES)[number] | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buf.toString("ascii", 4, 8) === "ftyp" && /avi[fs]/.test(buf.toString("ascii", 8, 12))) return "image/avif";
  return null;
}

function fail(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(request: Request, ctx: RouteContext<"/api/admin/products/[id]/images">) {
  // 1. Authorize on the server (RLS enforces it again on every write below).
  const owner = await getOwner();
  if (!owner) return fail(401, "Not authorized.");
  const { supabase } = owner;

  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return fail(400, "Invalid product id.");

  // 2. Reject oversized bodies before buffering when the client declares a length.
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_IMAGE_BYTES + 64 * 1024) return fail(413, "File is larger than 8 MB.");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "Expected a multipart form upload.");
  }
  const file = form.get("file");
  if (!(file instanceof File)) return fail(400, "No file provided.");
  if (file.size === 0) return fail(400, "The file is empty.");
  if (file.size > MAX_IMAGE_BYTES) return fail(413, "File is larger than 8 MB.");

  const alt = String(form.get("alt_text") ?? "").trim().slice(0, 300);
  const colourRaw = String(form.get("colour") ?? "").trim().slice(0, 40);
  const isConcept = form.get("is_concept") === "true";

  const buf = Buffer.from(await file.arrayBuffer());
  const type = sniff(buf);
  if (!type) return fail(415, "Only JPEG, PNG, WebP or AVIF images are allowed.");

  // 3. Decode to confirm it is a real image and read its dimensions.
  let width: number | undefined;
  let height: number | undefined;
  try {
    const meta = await sharp(buf).metadata();
    width = meta.width;
    height = meta.height;
    if (!width || !height || width > 12000 || height > 12000) return fail(415, "Image dimensions are not supported.");
  } catch {
    return fail(415, "The file could not be read as an image.");
  }

  // 4. The product must exist and be visible to this owner.
  const { data: product } = await supabase.from("products").select("id").eq("id", id).maybeSingle();
  if (!product) return fail(404, "Product not found.");

  const { data: last } = await supabase
    .from("product_images")
    .select("position")
    .eq("product_id", id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 5. Upload, then reference. If referencing fails, remove the upload so
  //    storage and the database never disagree.
  const path = `${id}/${randomUUID()}.${EXT[type]}`;
  const { error: upErr } = await supabase.storage.from(IMAGE_BUCKET).upload(path, buf, {
    contentType: type,
    upsert: false,
    cacheControl: "31536000",
  });
  if (upErr) {
    console.error("upload failed", upErr.message);
    return fail(502, "Upload to storage failed. Nothing was saved.");
  }

  const { data: row, error: insErr } = await supabase
    .from("product_images")
    .insert({
      product_id: id,
      storage_path: path,
      alt_text: alt,
      colour: colourRaw || null,
      is_concept: isConcept,
      position: (last?.position ?? 0) + 1,
      width,
      height,
    })
    .select("id, storage_path, alt_text, colour, position, is_cover, is_concept, width, height")
    .single();

  if (insErr || !row) {
    const { error: rmErr } = await supabase.storage.from(IMAGE_BUCKET).remove([path]);
    if (rmErr) console.error("rollback remove failed; orphan (private)", path, rmErr.message);
    return fail(500, "Could not save the image record. The upload was rolled back.");
  }

  return NextResponse.json({ ok: true, image: row }, { status: 201 });
}
