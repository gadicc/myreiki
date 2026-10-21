import { expect, test } from "./fixtures";

test("offline save, cold reload, sign-out fence, account switch and same-owner recovery", async ({
  page,
  context,
  login,
}) => {
  await login();
  const name = `Synthetic offline ${Date.now()}`;
  await page.goto("/practice/edit/new");
  await page.getByRole("textbox", { name: "Name", exact: true }).fill(name);
  await page.getByRole("textbox", { name: "Country Code" }).fill("JP");
  await page
    .getByRole("textbox", { name: "Notes", exact: true })
    .fill("初回\nSynthetic only 🌱");
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page).toHaveURL(/practice\/edit\/[a-f\d-]{36}$/);
  const recordPath = new URL(page.url()).pathname;
  await expect(page.getByText(/change\(s\) saved on this device/)).toHaveCount(
    0,
  );
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Name", exact: true }),
  ).toHaveValue(name);
  await context.setOffline(true);
  await page
    .getByRole("textbox", { name: "Notes", exact: true })
    .fill("Saved offline\n未同期 🌱");
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(
    page.getByText(/1 change\(s\) saved on this device/),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Notes", exact: true }),
  ).toHaveValue("Saved offline\n未同期 🌱");
  await page.getByRole("button", { name: "account of current user" }).click();
  await page.getByRole("menuitem", { name: "Logout" }).click();
  await expect(page.getByRole("button", { name: /^login$/i })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Notes", exact: true }),
  ).toHaveCount(0);
  await context.setOffline(false);
  // An existing server cookie cannot undo explicit local sign-out.
  await page.reload();
  await expect(page.getByRole("button", { name: /^login$/i })).toBeVisible();
  await context.route("https://accounts.google.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "Synthetic provider boundary",
    }),
  );
  await page.getByRole("button", { name: /^login$/i }).click();
  await expect(page).toHaveURL(/^https:\/\/accounts.google.com/);
  await login("B");
  await expect(page.getByText(name, { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "account of current user" }).click();
  await page.getByRole("menuitem", { name: "Logout" }).click();
  await page.getByRole("button", { name: /^login$/i }).click();
  await expect(page).toHaveURL(/^https:\/\/accounts.google.com/);
  await login("A");
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${recordPath}$`));
  await expect(
    page.getByRole("textbox", { name: "Notes", exact: true }),
  ).toHaveValue("Saved offline\n未同期 🌱");
  // A document closed during replay retains its durable lease. Periodic sync
  // must reclaim it without forcing a duplicate operation.
  await expect(page.getByText(/change\(s\) saved on this device/)).toHaveCount(
    0,
    { timeout: 75_000 },
  );
});

test("private API responses are not cached and deployed-mode local test login stays disabled", async ({
  page,
  login,
}) => {
  await login();
  await expect((await page.request.get("/dev-login")).status()).toBe(404);
  await expect(
    (
      await page.request.post("/api/dev-login", {
        form: { identity: "practitioner" },
      })
    ).status(),
  ).toBe(404);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  const urls = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys())
      for (const request of await (await caches.open(name)).keys())
        urls.push(request.url);
    return urls;
  });
  expect(
    urls.filter((url) => new URL(url).pathname.startsWith("/api/")),
  ).toEqual([]);
});
