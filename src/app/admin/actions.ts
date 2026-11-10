"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { NotAuthorizedError, requireOwner } from "@/lib/auth";
import { IMAGE_BUCKET } from "@/lib/env";
import { slugify } from "@/lib/format";
import {
  ImageMetaSchema,
  ProductFieldsSchema,
  VariantsSchema,
  firstIssue,
} from "@/lib/admin-validation";

export type ActionResult =
  | { ok: true; message?: string; version?: number }
  | { ok: false; error: string; code?: "stale" | "auth" | "validation" | "conflict" | "server"; currentVersion?: number };

type PgError = { code?: string; message: string; details?: string | null };

function mapDbError(e: PgError): ActionResult {
  if (e.code === "PT409" && e.message.includes("stale_version")) {
    const m = /current (\d+)/.exec(e.details ?? "");
    return {
      ok: false,
      code: "stale",
      currentVersion: m ? Number(m[1]) : undefined,
      error:
        "Someone saved a newer version of this product while you were editing (for example a price or stock change). Your changes were NOT saved. Reload to see the latest values, then reapply your edits.",
    };
  }
  if (e.code === "PT409" || e.code === "40001") return { ok: false, code: "stale", error: "The gallery changed elsewhere. Reload and try again." };
  if (e.code === "42501") return { ok: false, code: "auth", error: "You are not authorized to do that." };
  if (e.code === "23505") return { ok: false, code: "conflict", error: "That URL slug is already used by another product." };
  if (e.code === "23514") return { ok: false, code: "validation", error: "A value is out of the allowed range." };
  if (e.code === "P0002") return { ok: false, code: "validation", error: "Product not found." };
  console.error("admin db error", e);
  return { ok: false, code: "server", error: "Something went wrong saving. Please try again." };
}

async function guard<T extends ActionResult>(fn: () => Promise<T>): Promise<ActionResult> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof NotAuthorizedError) return { ok: false, code: "auth", error: "Your session has ended or this account is not an owner. Please sign in again." };
    throw e;
  }
}

function revalidateStore(slug?: string) {
  revalidatePath("/", "layout");
  if (slug) revalidatePath(`/shop/${slug}`);
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

const SignInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(200),
  password: z.string().min(1, "Enter your password.").max(200),
});

export async function signIn(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = SignInSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { ok: false, code: "validation", error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return { ok: false, code: "auth", error: "Email or password is incorrect." };
  }
  const { data: owner } = await supabase.from("owners").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (!owner) {
    await supabase.auth.signOut();
    return {
      ok: false,
      code: "auth",
      error: "This account is not authorized to manage the store. Ask the store administrator to add it as an owner.",
    };
  }
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

function readProductForm(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const fields = ProductFieldsSchema.safeParse({
    name,
    slug: slugRaw || slugify(name),
    category: String(formData.get("category") ?? "t-shirts"),
    description: String(formData.get("description") ?? ""),
    details: String(formData.get("details") ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    price_ngn: String(formData.get("price_ngn") ?? ""),
    featured: formData.get("featured") === "on",
    is_demo: formData.get("is_demo") === "on",
  });
  let variantsJson: unknown = [];
  try {
    variantsJson = JSON.parse(String(formData.get("variants") ?? "[]"));
  } catch {
    variantsJson = null;
  }
  const variants = VariantsSchema.safeParse(variantsJson);
  return { fields, variants };
}

export async function createProduct(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const res = await guard(async () => {
    const { supabase } = await requireOwner();
    const { fields, variants } = readProductForm(formData);
    if (!fields.success) return { ok: false, code: "validation", error: firstIssue(fields.error) } as ActionResult;
    if (!variants.success) return { ok: false, code: "validation", error: firstIssue(variants.error) } as ActionResult;

    const { data, error } = await supabase.rpc("admin_create_product", {
      p_product: fields.data,
      p_variants: variants.data,
    });
    if (error) return mapDbError(error);
    const id = (data as { id: string }[])[0]?.id;
    return { ok: true, message: id } as ActionResult;
  });
  if (res.ok && res.message) redirect(`/admin/products/${res.message}?created=1`);
  return res;
}

export async function saveProduct(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return guard(async () => {
    const { supabase } = await requireOwner();
    const id = z.string().uuid().safeParse(formData.get("id"));
    const version = z.coerce.number().int().min(1).safeParse(formData.get("version"));
    if (!id.success || !version.success) return { ok: false, code: "validation", error: "Missing product id or version." };

    const { fields, variants } = readProductForm(formData);
    if (!fields.success) return { ok: false, code: "validation", error: firstIssue(fields.error) };
    if (!variants.success) return { ok: false, code: "validation", error: firstIssue(variants.error) };

    const { data, error } = await supabase.rpc("admin_save_product", {
      p_id: id.data,
      p_expected_version: version.data,
      p_product: fields.data,
      p_variants: variants.data,
    });
    if (error) return mapDbError(error);
    const newVersion = (data as { version: number }[])[0]?.version;
    revalidateStore(fields.data.slug);
    revalidatePath(`/admin/products/${id.data}`);
    return { ok: true, message: "Saved.", version: newVersion };
  });
}

const StatusSchema = z.object({
  id: z.string().uuid(),
  version: z.coerce.number().int().min(1),
  status: z.enum(["draft", "published", "archived"]),
});

export async function setProductStatus(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return guard(async () => {
    const { supabase } = await requireOwner();
    const parsed = StatusSchema.safeParse({
      id: formData.get("id"),
      version: formData.get("version"),
      status: formData.get("status"),
    });
    if (!parsed.success) return { ok: false, code: "validation", error: firstIssue(parsed.error) };
    const { id, version, status } = parsed.data;

    if (status === "published") {
      const { data: p } = await supabase
        .from("products")
        .select("slug, product_variants(id), product_images(id, alt_text)")
        .eq("id", id)
        .maybeSingle();
      if (!p) return { ok: false, code: "validation", error: "Product not found." };
      const prod = p as { product_variants: { id: string }[]; product_images: { id: string; alt_text: string }[] };
      if (prod.product_variants.length === 0)
        return { ok: false, code: "validation", error: "Add at least one colour and size before publishing." };
      if (prod.product_images.length === 0)
        return { ok: false, code: "validation", error: "Add at least one image before publishing." };
      if (prod.product_images.some((i) => !i.alt_text.trim()))
        return { ok: false, code: "validation", error: "Every image needs alt text before publishing." };
    }

    const { data, error } = await supabase.rpc("admin_save_product", {
      p_id: id,
      p_expected_version: version,
      p_product: { status },
      p_variants: null,
    });
    if (error) return mapDbError(error);
    const { data: slugRow } = await supabase.from("products").select("slug").eq("id", id).maybeSingle();
    revalidateStore(slugRow?.slug);
    revalidatePath(`/admin/products/${id}`);
    const label = status === "published" ? "Published." : status === "archived" ? "Archived." : "Moved to drafts.";
    return { ok: true, message: label, version: (data as { version: number }[])[0]?.version };
  });
}

// ---------------------------------------------------------------------------
// Images (upload is a route handler: /api/admin/products/[id]/images)
// ---------------------------------------------------------------------------

export async function updateImageMeta(
  imageId: string,
  input: { alt_text: string; colour: string | null; is_concept: boolean },
): Promise<ActionResult> {
  return guard(async () => {
    const { supabase } = await requireOwner();
    if (!z.string().uuid().safeParse(imageId).success) return { ok: false, error: "Bad image id" };
    const parsed = ImageMetaSchema.safeParse(input);
    if (!parsed.success) return { ok: false, code: "validation", error: firstIssue(parsed.error) };
    const { data, error } = await supabase
      .from("product_images")
      .update({ ...parsed.data, colour: parsed.data.colour || null })
      .eq("id", imageId)
      .select("product_id")
      .maybeSingle();
    if (error) return mapDbError(error);
    if (!data) return { ok: false, error: "Image not found." };
    revalidateStore();
    return { ok: true, message: "Image details saved." };
  });
}

export async function setCoverImage(imageId: string): Promise<ActionResult> {
  return guard(async () => {
    const { supabase } = await requireOwner();
    if (!z.string().uuid().safeParse(imageId).success) return { ok: false, error: "Bad image id" };
    const { error } = await supabase.rpc("admin_set_cover", { p_image: imageId });
    if (error) return mapDbError(error);
    revalidateStore();
    return { ok: true, message: "Cover image updated." };
  });
}

export async function reorderImages(productId: string, ids: string[]): Promise<ActionResult> {
  return guard(async () => {
    const { supabase } = await requireOwner();
    const parsed = z.object({ productId: z.string().uuid(), ids: z.array(z.string().uuid()).max(100) }).safeParse({ productId, ids });
    if (!parsed.success) return { ok: false, error: "Invalid order." };
    const { error } = await supabase.rpc("admin_reorder_images", { p_product: productId, p_ids: ids });
    if (error) return mapDbError(error);
    revalidateStore();
    return { ok: true, message: "Gallery order saved." };
  });
}

/**
 * Remove the DB reference first, then the file. If the file removal fails the
 * object is orphaned but stays private (storage RLS only serves objects that a
 * published product references), and is logged for cleanup.
 */
export async function deleteImage(imageId: string): Promise<ActionResult> {
  return guard(async () => {
    const { supabase } = await requireOwner();
    if (!z.string().uuid().safeParse(imageId).success) return { ok: false, error: "Bad image id" };
    const { data: row, error } = await supabase
      .from("product_images")
      .delete()
      .eq("id", imageId)
      .select("storage_path")
      .maybeSingle();
    if (error) return mapDbError(error);
    if (!row) return { ok: false, error: "Image not found (it may already have been removed)." };
    const { error: rmErr } = await supabase.storage.from(IMAGE_BUCKET).remove([row.storage_path]);
    if (rmErr) console.error("orphaned storage object", row.storage_path, rmErr.message);
    revalidateStore();
    return { ok: true, message: "Image removed." };
  });
}
