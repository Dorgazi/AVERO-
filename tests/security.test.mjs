/**
 * Database / storage security tests against the real Supabase project.
 *   npm run test:security
 *
 * Test data is clearly identified: slug prefix "test-", name "[TEST] …",
 * is_demo = true, and it is deleted at the end of the run.
 * Owner / shopper suites are skipped if TEST_* credentials are not configured.
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
config({ path: path.join(root, ".env.local") });
config({ path: path.join(root, ".env.test.local") });

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const BUCKET = "product-images";
const mk = () => createClient(URL_, KEY, { auth: { persistSession: false } });

async function signedIn(email, password) {
  if (!email || !password) return null;
  const c = mk();
  const { error } = await c.auth.signInWithPassword({ email, password });
  return error ? null : c;
}

const anon = mk();
const owner = await signedIn(process.env.TEST_OWNER_EMAIL, process.env.TEST_OWNER_PASSWORD);
const shopper = await signedIn(process.env.TEST_SHOPPER_EMAIL, process.env.TEST_SHOPPER_PASSWORD);
const ownerOk = owner ? (await owner.rpc("is_owner")).data === true : false;

describe("anonymous shopper", () => {
  test("sees only published products", async () => {
    const { data, error } = await anon.from("products").select("status");
    assert.equal(error, null);
    assert.ok(data.every((p) => p.status === "published"), "anon saw a non-published product");
  });

  test("cannot insert products", async () => {
    const { error } = await anon.from("products").insert({ slug: "test-anon", name: "[TEST] anon", price_ngn: 1 });
    assert.ok(error, "anon insert should fail");
  });

  test("cannot call admin RPCs", async () => {
    const { error } = await anon.rpc("admin_save_product", {
      p_id: randomUUID(), p_expected_version: 1, p_product: { price_ngn: 1 }, p_variants: null,
    });
    assert.ok(error, "anon RPC should fail");
  });

  test("cannot read the owners list", async () => {
    const { data } = await anon.from("owners").select("user_id");
    assert.deepEqual(data ?? [], []);
  });

  test("cannot upload to storage", async () => {
    const { error } = await anon.storage.from(BUCKET).upload(`test/${randomUUID()}.jpg`, Buffer.from([0xff, 0xd8, 0xff, 0xe0]), { contentType: "image/jpeg" });
    assert.ok(error, "anon upload should fail");
  });

  test("bucket is private (no public URL access)", async () => {
    const r = await fetch(`${URL_}/storage/v1/object/public/${BUCKET}/does-not-matter.jpg`);
    assert.notEqual(r.status, 200);
  });
});

describe("signed-in non-owner", { skip: !shopper && "TEST_SHOPPER_* not configured" }, () => {
  test("cannot write products or call admin RPCs", async () => {
    const ins = await shopper.from("products").insert({ slug: "test-shopper", name: "[TEST] shopper", price_ngn: 1 });
    assert.ok(ins.error);
    const rpc = await shopper.rpc("admin_create_product", { p_product: { slug: "test-x", name: "x", price_ngn: 1 }, p_variants: [] });
    assert.ok(rpc.error);
    assert.equal((await shopper.rpc("is_owner")).data, false);
  });
  test("cannot upload to storage", async () => {
    const { error } = await shopper.storage.from(BUCKET).upload(`test/${randomUUID()}.jpg`, Buffer.from([0xff, 0xd8, 0xff]), { contentType: "image/jpeg" });
    assert.ok(error);
  });
});

describe("owner workflow + draft privacy + stale edits", { skip: !ownerOk && "TEST_OWNER_* not configured or not an owner" }, () => {
  const slug = `test-${randomUUID().slice(0, 8)}`;
  let id;
  let imagePath;

  before(async () => {
    const { data, error } = await owner.rpc("admin_create_product", {
      p_product: { slug, name: "[TEST] Security fixture", price_ngn: 50000, is_demo: true },
      p_variants: [{ colour: "Black", size: "M", stock: 3 }],
    });
    assert.equal(error, null, error?.message);
    id = data[0].id;
  });

  after(async () => {
    if (!id) return;
    if (imagePath) await owner.storage.from(BUCKET).remove([imagePath]);
    await owner.from("products").delete().eq("id", id);
  });

  test("draft product is invisible to anon", async () => {
    const { data } = await anon.from("products").select("id").eq("id", id);
    assert.deepEqual(data, []);
    const v = await anon.from("product_variants").select("id").eq("product_id", id);
    assert.deepEqual(v.data, []);
  });

  test("draft image is private", async () => {
    imagePath = `${id}/${randomUUID()}.jpg`;
    const bytes = await readFile(path.join(root, "seed/images/ankle-sock.jpg"));
    const up = await owner.storage.from(BUCKET).upload(imagePath, bytes, { contentType: "image/jpeg" });
    assert.equal(up.error, null, up.error?.message);
    const ins = await owner.from("product_images").insert({ product_id: id, storage_path: imagePath, alt_text: "[TEST] fixture" });
    assert.equal(ins.error, null, ins.error?.message);

    const signed = await anon.storage.from(BUCKET).createSignedUrl(imagePath, 60);
    assert.ok(signed.error || !signed.data?.signedUrl, "anon could sign a draft image");
    const dl = await anon.storage.from(BUCKET).download(imagePath);
    assert.ok(dl.error, "anon could download a draft image");
    const ownerSigned = await owner.storage.from(BUCKET).createSignedUrl(imagePath, 60);
    assert.ok(ownerSigned.data?.signedUrl, "owner should be able to sign draft image");
  });

  test("bucket rejects disallowed type and oversize files", async () => {
    const bad = await owner.storage.from(BUCKET).upload(`${id}/${randomUUID()}.svg`, Buffer.from("<svg/>"), { contentType: "image/svg+xml" });
    assert.ok(bad.error, "svg should be rejected by bucket allowed_mime_types");
    const big = await owner.storage.from(BUCKET).upload(`${id}/${randomUUID()}.jpg`, Buffer.alloc(8 * 1024 * 1024 + 10), { contentType: "image/jpeg" });
    assert.ok(big.error, "oversize file should be rejected by bucket file_size_limit");
  });

  test("stale edit is rejected; price and stock edits apply", async () => {
    const { data: p } = await owner.from("products").select("version").eq("id", id).single();
    const ok = await owner.rpc("admin_save_product", {
      p_id: id, p_expected_version: p.version, p_product: { price_ngn: 55000 },
      p_variants: [{ colour: "Black", size: "M", stock: 9 }],
    });
    assert.equal(ok.error, null, ok.error?.message);
    const stale = await owner.rpc("admin_save_product", {
      p_id: id, p_expected_version: p.version, p_product: { price_ngn: 1 }, p_variants: null,
    });
    assert.ok(stale.error, "stale write should fail");
    assert.match(stale.error.message, /stale_version/);
    const { data: after } = await owner.from("products").select("price_ngn, version, product_variants(stock)").eq("id", id).single();
    assert.equal(after.price_ngn, 55000);
    assert.equal(after.product_variants[0].stock, 9);
    assert.equal(after.version, p.version + 1);
  });

  test("price must be whole naira", async () => {
    const { data: p } = await owner.from("products").select("version").eq("id", id).single();
    const r = await owner.rpc("admin_save_product", {
      p_id: id, p_expected_version: p.version, p_product: { price_ngn: "50000.50" }, p_variants: null,
    });
    assert.ok(r.error, "fractional naira should be rejected");
  });

  test("negative stock is rejected", async () => {
    const { data: p } = await owner.from("products").select("version").eq("id", id).single();
    const r = await owner.rpc("admin_save_product", {
      p_id: id, p_expected_version: p.version, p_product: {}, p_variants: [{ colour: "Black", size: "M", stock: -1 }],
    });
    assert.ok(r.error);
  });

  test("publishing exposes product and its image to anon; archiving hides them", async () => {
    const pub = async (status) => {
      const { data: p } = await owner.from("products").select("version").eq("id", id).single();
      const r = await owner.rpc("admin_save_product", { p_id: id, p_expected_version: p.version, p_product: { status }, p_variants: null });
      assert.equal(r.error, null, r.error?.message);
    };
    await pub("published");
    assert.equal((await anon.from("products").select("id").eq("id", id)).data.length, 1);
    const s = await anon.storage.from(BUCKET).createSignedUrl(imagePath, 60);
    assert.ok(s.data?.signedUrl, "anon should sign a published image");
    assert.equal((await fetch(s.data.signedUrl)).status, 200);

    await pub("archived");
    assert.equal((await anon.from("products").select("id").eq("id", id)).data.length, 0);
    const s2 = await anon.storage.from(BUCKET).createSignedUrl(imagePath, 60);
    assert.ok(s2.error || !s2.data?.signedUrl, "archived image still signable by anon");
  });
});
