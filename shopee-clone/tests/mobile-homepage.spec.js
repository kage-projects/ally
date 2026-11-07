import { test, expect } from "@playwright/test";

test("mobile homepage renders its reference sections and intact local images", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Shopee Live", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Shopee Video", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navigasi utama" })).toBeVisible();
  await expect(page.locator('[data-ally-root]')).toHaveAttribute('data-ally-status','disabled');
  await expect(page.locator('.ally-toast')).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator("img").evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
});

test("search accepts text, services scroll, and navigation stays anchored", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const search = page.getByRole("textbox", { name: "Cari di Shopee" });
  await search.fill("Poco M7");
  await expect(search).toHaveValue("Poco M7");
  const services = page.locator(".category-scroll");
  await services.evaluate(element => { element.scrollLeft = 50; });
  expect(await services.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
  const navigation = await page.getByRole("navigation").boundingBox();
  expect(Math.abs(navigation.y + navigation.height - page.viewportSize().height)).toBeLessThanOrEqual(1);
});
