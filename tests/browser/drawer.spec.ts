import { expect, test } from "@playwright/test";

test("language picker sits below About and keeps the drawer usable", async ({
  page,
}) => {
  await page.goto("/about");
  await expect(page.getByRole("combobox", { name: "Language" })).toHaveCount(0);
  await page.getByRole("button", { name: "menu", exact: true }).click();
  const picker = page.getByRole("combobox", { name: "Language" });
  const about = page.getByRole("link", { name: "About", exact: true });
  await expect(picker).toBeVisible();
  expect((await picker.boundingBox())!.y).toBeGreaterThan(
    (await about.boundingBox())!.y,
  );
  await picker.click();
  await page.getByRole("option", { name: "日本語", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.getByRole("combobox", { name: "表示言語" })).toBeVisible();
  await page.getByRole("combobox").press("ArrowDown");
  await page.getByRole("option", { name: "English", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.keyboard.press("Escape");
  await expect(picker).toHaveCount(0);
});

test("native install action consumes one prompt and disappears after installation", async ({
  page,
}) => {
  await page.goto("/about");
  await page.getByRole("button", { name: "menu", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Install this app" }),
  ).toHaveCount(0);
  await page.evaluate(() => {
    window.dispatchEvent(
      Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
        prompt: async () => {
          document.documentElement.dataset.installCalls = String(
            Number(document.documentElement.dataset.installCalls ?? 0) + 1,
          );
          return { outcome: "dismissed" };
        },
      }),
    );
  });
  await page.getByRole("button", { name: "Install this app" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-install-calls", "1");
  await page.getByRole("button", { name: "menu", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Install this app" }),
  ).toHaveCount(0);
  await page.evaluate(() => {
    window.dispatchEvent(
      Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
        prompt: async () => ({ outcome: "accepted" }),
      }),
    );
  });
  await expect(
    page.getByRole("button", { name: "Install this app" }),
  ).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  await expect(
    page.getByRole("button", { name: "Install this app" }),
  ).toHaveCount(0);
});

test.describe("iOS home-screen installation", () => {
  test.use({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
  });

  test("offers instructions outside the drawer", async ({ page }) => {
    await page.goto("/about");
    await page.getByRole("button", { name: "menu", exact: true }).click();
    await page.getByRole("button", { name: "Install this app" }).click();
    const dialog = page.getByRole("dialog", { name: "Install this app" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(
      "Tap Share, then Add to Home Screen, then Add.",
    );
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(dialog).toHaveCount(0);
  });

  test("hides install when already launched from the home screen", async ({
    page,
  }) => {
    await page.addInitScript(() =>
      Object.defineProperty(navigator, "standalone", { value: true }),
    );
    await page.goto("/about");
    await page.getByRole("button", { name: "menu", exact: true }).click();
    await expect(
      page.getByRole("combobox", { name: "Language" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Install this app" }),
    ).toHaveCount(0);
  });
});
