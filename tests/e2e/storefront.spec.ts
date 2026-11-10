import { test, expect } from "@playwright/test";

// Runs on a Pixel 7 viewport (see playwright.config.ts). Requires the demo seed.
test.describe("mobile storefront", () => {
  test("home renders hero, featured collection and silhouette", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Structure");
    await expect(page.getByRole("heading", { name: "The Essentials" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cut wide. Worn easy." })).toBeVisible();
    const imgs = page.locator("main img");
    const count = await imgs.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) expect(await imgs.nth(i).getAttribute("alt")).not.toBe(null);
    await expect(page.getByText("Sample product").first()).toBeVisible();
    // No horizontal overflow at phone width.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("mobile menu opens, traps focus and closes with Escape", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Open menu" });
    await toggle.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Menu" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("link").first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
  });

  test("catalog filters by category and availability", async ({ page }) => {
    await page.goto("/shop");
    await page.getByLabel("Category").selectOption("socks");
    await expect(page).toHaveURL(/category=socks/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Socks");
    await expect(page.locator("main article")).toHaveCount(2);
    await page.goto("/shop?category=t-shirts");
    await expect(page.locator("main article")).toHaveCount(2);
    await page.goto("/shop?colour=White&size=XXL&availability=in-stock");
    await expect(page.getByText("Nothing matches those filters.")).toBeVisible();
    await page.goto("/shop?category=activewear");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Activewear");
    await expect(page.locator("main article")).toHaveCount(2);
    await page.goto("/shop");
    await expect(page.locator("main article")).toHaveCount(6);
  });

  test("tapping the main photo flips between front and back; no native radio circles", async ({ page }) => {
    await page.goto("/shop/essential-tee");
    const gallery = page.getByRole("region", { name: "Product images" });
    await expect(gallery.getByRole("img", { name: /front view/ })).toBeVisible();
    await gallery.getByRole("button", { name: "Show back view" }).click();
    await expect(gallery.getByRole("img", { name: /back view/ })).toBeVisible();
    await gallery.getByRole("button", { name: "Show front view" }).click();
    await expect(gallery.getByRole("img", { name: /front view/ })).toBeVisible();
    // Radios stay usable but are never painted.
    const opacities = await page.locator("input[type=radio]").evaluateAll((els) =>
      els.map((e) => getComputedStyle(e).opacity),
    );
    expect(opacities.length).toBeGreaterThan(0);
    expect(opacities.every((o) => o === "0")).toBe(true);
  });

  test("sold-out size is disabled; other sizes stay selectable", async ({ page }) => {
    await page.goto("/shop/essential-tee");
    await page.getByRole("radio", { name: "White", exact: true }).check();
    await expect(page.getByRole("radio", { name: "XXL" })).toBeDisabled();
    await expect(page.getByRole("radio", { name: "XL", exact: true })).toBeEnabled();
    await page.getByRole("radio", { name: "Black", exact: true }).check();
    await expect(page.getByRole("radio", { name: "XXL" })).toBeEnabled();
  });

  test("size selection, add to bag, persistence, quantity and removal", async ({ page }) => {
    await page.goto("/shop/essential-tee");
    await expect(page.getByText("₦80,000").first()).toBeVisible();

    // Adding without a size is refused.
    await page.getByRole("button", { name: "Add to bag" }).click();
    await expect(page.getByRole("status")).toContainText("Please choose a size");

    // Keyboard: choose colour + size via radio groups.
    await page.getByRole("radio", { name: "Black", exact: true }).check();
    await page.getByRole("radio", { name: "L", exact: true }).check();
    await page.getByRole("button", { name: "Add to bag" }).click();
    await expect(page.getByRole("status")).toContainText("added to your bag");
    await expect(page.getByRole("link", { name: /Cart, 1 item/ })).toBeVisible();

    // Persists across a reload (new visit).
    await page.reload();
    await expect(page.getByRole("link", { name: /Cart, 1 item/ })).toBeVisible();

    await page.goto("/cart");
    await expect(page.getByText("Black · Size L")).toBeVisible();
    await expect(page.getByText("Prices and stock checked just now.")).toBeVisible();
    await page.getByRole("button", { name: /Increase quantity/ }).click();
    await expect(page.getByLabel("Quantity 2")).toBeVisible();
    await expect(page.getByText("₦160,000").first()).toBeVisible();
    await page.getByRole("button", { name: /Decrease quantity/ }).click();
    await expect(page.getByLabel("Quantity 1")).toBeVisible();

    // Checkout review: server re-check, payments awaiting setup, demo blocked.
    await page.getByRole("link", { name: "Review order" }).click();
    await expect(page.getByText("Payments are awaiting setup.")).toBeVisible();
    await expect(page.getByText(/Sample products are for demonstration/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Pay securely/ })).toBeDisabled();

    await page.goto("/cart");
    await page.getByRole("button", { name: /Remove The Essential Tee/ }).click();
    await expect(page.getByText("Your bag is empty.")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Your bag is empty.")).toBeVisible();
  });

  test("stale cart prices are corrected from the server", async ({ page }) => {
    await page.goto("/shop/essential-tee");
    await page.getByRole("radio", { name: "M", exact: true }).check();
    await page.getByRole("button", { name: "Add to bag" }).click();
    // Tamper with the stored price to simulate an old snapshot.
    await page.evaluate(() => {
      const k = "avero.cart.v1";
      const lines = JSON.parse(localStorage.getItem(k) ?? "[]");
      lines[0].priceNgn = 1;
      localStorage.setItem(k, JSON.stringify(lines));
    });
    await page.goto("/cart");
    await expect(page.getByText(/Price updated to ₦80,000/)).toBeVisible();
    await expect(page.getByText("₦80,000").first()).toBeVisible();
    await page.evaluate(() => localStorage.clear());
  });
});
