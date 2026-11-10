import { test, expect } from "@playwright/test";

test.describe("unauthorized access", () => {
  test("admin pages redirect anonymous visitors to sign-in", async ({ page }) => {
    for (const p of ["/admin", "/admin/products/new", "/admin/products/00000000-0000-0000-0000-000000000000"]) {
      await page.goto(p);
      await expect(page).toHaveURL(/\/admin\/login$/);
    }
    await expect(page.getByRole("heading", { name: "Owner sign-in" })).toBeVisible();
  });

  test("upload API rejects anonymous requests", async ({ request }) => {
    const res = await request.post("/api/admin/products/00000000-0000-0000-0000-000000000000/images", {
      multipart: { file: { name: "x.jpg", mimeType: "image/jpeg", buffer: Buffer.from([0xff, 0xd8, 0xff]) } },
    });
    expect(res.status()).toBe(401);
  });

  test("wrong credentials are refused without revealing which part was wrong", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill("nobody@avero.test");
    await page.getByLabel("Password").fill("definitely-wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /incorrect/i })).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("unknown or unpublished product slugs 404", async ({ page }) => {
    const res = await page.goto("/shop/test-does-not-exist");
    expect(res?.status()).toBe(404);
  });
});
