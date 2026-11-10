import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(".env.local") });
config({ path: path.resolve(".env.test.local") });

const EMAIL = process.env.TEST_OWNER_EMAIL;
const PASSWORD = process.env.TEST_OWNER_PASSWORD;
const SHOPPER_EMAIL = process.env.TEST_SHOPPER_EMAIL;
const SHOPPER_PASSWORD = process.env.TEST_SHOPPER_PASSWORD;

const NAME = `[TEST] E2E Tee ${Date.now().toString(36)}`;
const SLUG = `test-e2e-${Date.now().toString(36)}`;

async function login(page: Page, email = EMAIL!, password = PASSWORD!) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test.describe("owner dashboard", () => {
  test.skip(!EMAIL || !PASSWORD, "TEST_OWNER_* not configured");

  test.afterAll(async () => {
    // Remove the test product and its files using the owner's own session.
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false },
    });
    await sb.auth.signInWithPassword({ email: EMAIL!, password: PASSWORD! });
    const { data } = await sb.from("products").select("id, product_images(storage_path)").like("slug", "test-e2e-%");
    for (const p of data ?? []) {
      const paths = p.product_images.map((i: { storage_path: string }) => i.storage_path);
      if (paths.length) await sb.storage.from("product-images").remove(paths);
      await sb.from("products").delete().eq("id", p.id);
    }
  });

  test("non-owner account is refused", async ({ page }) => {
    test.skip(!SHOPPER_EMAIL || !SHOPPER_PASSWORD, "TEST_SHOPPER_* not configured");
    await login(page, SHOPPER_EMAIL, SHOPPER_PASSWORD);
    await expect(page.getByRole("alert").filter({ hasText: /not authorized/i })).toBeVisible();
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("create, upload, edit, preview, publish, stale edit, archive", async ({ page, browser }) => {
    await login(page);
    await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();

    // Create a draft
    await page.getByRole("link", { name: "New product" }).first().click();
    await page.getByLabel("Name").fill(NAME);
    await page.getByLabel("URL slug").fill(SLUG);
    await page.getByLabel("Price (₦, whole naira)").fill("50,000.50");
    await page.getByLabel("Sample product (labelled; never sold)").check();
    await page.getByLabel("Add colour").fill("Black");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.getByRole("button", { name: "Create draft" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "whole-naira" })).toBeVisible();
    await page.getByLabel("Price (₦, whole naira)").fill("50,000");
    await page.getByLabel("Stock for Black, size M").fill("4");
    await page.getByRole("button", { name: "Create draft" }).click();
    await expect(page.getByText("Draft created.")).toBeVisible();
    const editUrl = page.url();

    // Draft is private
    const anonCtx = await browser.newContext();
    const anonPage = await anonCtx.newPage();
    expect((await anonPage.goto(`/shop/${SLUG}`))?.status()).toBe(404);

    // Publishing is blocked without images
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "at least one image" })).toBeVisible();

    // Invalid upload is refused by the server
    await page.getByLabel("Upload images").setInputFiles({ name: "evil.jpg", mimeType: "image/jpeg", buffer: Buffer.from("not an image at all, sorry") });
    await expect(page.getByText(/evil\.jpg: .*(JPEG|read as an image)/)).toBeVisible();

    // Valid upload
    await page.getByLabel("Upload images").setInputFiles([
      path.resolve("seed/images/essential-black-front.jpg"),
      path.resolve("seed/images/essential-black-back.jpg"),
    ]);
    await expect(page.getByText("essential-black-back.jpg: Uploaded")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("list", { name: "Gallery order" }).getByRole("listitem")).toHaveCount(2);

    // Alt text required before publishing
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "alt text" })).toBeVisible();
    const rows = page.getByRole("list", { name: "Gallery order" }).getByRole("listitem");
    for (let i = 0; i < 2; i++) {
      await rows.nth(i).getByLabel(/Alt text/).fill(`[TEST] Black boxy tee view ${i + 1}`);
      await rows.nth(i).getByRole("button", { name: "Save details" }).click();
      await expect(page.getByText("Image details saved.", { exact: true })).toBeVisible();
    }

    // Reorder + cover
    await rows.nth(1).getByRole("button", { name: /Move image 2 earlier/ }).click();
    await expect(page.getByText("Gallery order saved.", { exact: true })).toBeVisible();
    await rows.nth(0).getByRole("button", { name: "Set as cover" }).click();
    await expect(page.getByText("Cover image updated.", { exact: true })).toBeVisible();

    // Preview
    await page.getByRole("link", { name: "Preview" }).click();
    await expect(page.getByText(/Preview of a draft product/)).toBeVisible();
    await page.goBack();

    // Publish
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Published.", { exact: true })).toBeVisible();
    await anonPage.goto(`/shop/${SLUG}`);
    await expect(anonPage.getByRole("heading", { name: NAME })).toBeVisible();
    await expect(anonPage.locator("main img").first()).toHaveAttribute("alt", /\[TEST\] Black boxy tee/);

    // Stale edit: a second tab saves a new price; the first tab's older form is refused
    const page2 = await page.context().newPage();
    await page2.goto(editUrl);
    await page.reload();
    await page2.getByLabel("Price (₦, whole naira)").fill("61000");
    await page2.getByRole("button", { name: "Save changes" }).click();
    await expect(page2.getByText("Saved.", { exact: true })).toBeVisible();
    await page.getByLabel("Stock for Black, size M").fill("0");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "newer version" })).toBeVisible();
    await anonPage.reload();
    await expect(anonPage.getByText("₦61,000").first()).toBeVisible();
    await expect(anonPage.getByRole("radio", { name: "M" })).toBeEnabled();

    // Fresh edit of stock applies (sold-out state shows on storefront)
    await page.reload();
    await page.getByLabel("Stock for Black, size M").fill("0");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
    await anonPage.reload();
    await expect(anonPage.getByRole("button", { name: "Sold out" })).toBeDisabled();

    // Remove an image
    page.once("dialog", (d) => d.accept());
    await page.getByRole("list", { name: "Gallery order" }).getByRole("listitem").first().getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText("Image removed.", { exact: true })).toBeVisible();
    await expect(page.getByRole("list", { name: "Gallery order" }).getByRole("listitem")).toHaveCount(1);

    // Archive hides it from the storefront again
    await page.getByRole("button", { name: "Archive" }).click();
    await expect(page.getByText("Archived.", { exact: true })).toBeVisible();
    expect((await anonPage.goto(`/shop/${SLUG}`))?.status()).toBe(404);
    await anonCtx.close();
  });
});
