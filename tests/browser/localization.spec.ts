import superjson from "superjson";
import type { Snapshot } from "../../src/data/model";
import { expect, test } from "./fixtures";

test("server language negotiation and saved preference", async ({
  request,
}) => {
  const ja = await request.get("/about", {
    headers: { "Accept-Language": "ja-JP, en;q=0.5" },
  });
  expect(ja.status()).toBe(200);
  const html = await ja.text();
  expect(html).toContain('lang="ja"');
  expect(html).toContain("MyReikiについて");
  const en = await request.get("/about", {
    headers: { "Accept-Language": "ja", Cookie: "NEXT_LOCALE=en" },
  });
  expect(await en.text()).toContain('lang="en"');
});

test("language changes retain drafts, validation, offline edits and cold reloads", async ({
  page,
  context,
  login,
}) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await login();
  const name = `Synthetic locale ${Date.now()}`;
  const switchTo = async (locale: "en" | "ja") => {
    await page.getByRole("combobox", { name: /^(Language|表示言語)$/ }).click();
    await page
      .getByRole("option", {
        name: locale === "ja" ? "日本語" : "English",
        exact: true,
      })
      .click();
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
  };
  await page.goto("/practice/edit/new");
  await page.getByRole("textbox", { name: "Name", exact: true }).fill(name);
  await page
    .getByRole("textbox", { name: "Notes", exact: true })
    .fill("Unsubmitted draft 日本語 🌱");
  await switchTo("ja");
  await expect(
    page.getByRole("textbox", { name: "名前", exact: true }),
  ).toHaveValue(name);
  await expect(
    page.getByRole("textbox", { name: "メモ", exact: true }),
  ).toHaveValue("Unsubmitted draft 日本語 🌱");
  await page
    .getByRole("textbox", { name: "国コード", exact: true })
    .fill("JPN");
  await expect(
    page.getByText("国コードを半角英字2文字で入力してください。", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "国コード", exact: true }).fill("JP");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page).toHaveURL(/practice\/edit\/[a-f\d-]{36}$/);
  const id = new URL(page.url()).pathname.split("/").at(-1)!;
  await expect(
    page.getByText(/この端末に保存した変更 \d+ 件が同期待ち/),
  ).toHaveCount(0);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "名前", exact: true }),
  ).toHaveValue(name);
  await context.setOffline(true);
  await page
    .getByRole("textbox", { name: "メモ", exact: true })
    .fill("Offline unchanged 施術 🌱");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(
    page.getByText("この端末に保存した変更 1 件が同期待ちです。", {
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "メモ", exact: true }),
  ).toHaveValue("Offline unchanged 施術 🌱");
  await switchTo("en");
  await expect(
    page.getByText("1 change saved on this device, waiting to sync.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Notes", exact: true }),
  ).toHaveValue("Offline unchanged 施術 🌱");
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Name", exact: true }),
  ).toHaveValue(name);
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page.getByText(/changes? saved on this device/)).toHaveCount(0, {
    timeout: 75_000,
  });
  const snapshot = superjson.parse<Snapshot>(
    await (await page.request.get("/api/data")).text(),
  );
  expect(snapshot.practices.find((row) => row._id === id)?.notes).toBe(
    "Offline unchanged 施術 🌱",
  );
  await switchTo("ja");
  await page.goto("/treatment/edit/new");
  await expect(
    page.getByRole("group", { name: "日時", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("通常", { exact: true })).toBeVisible();
  await page.getByRole("spinbutton", { name: "施術時間（分）" }).fill("0");
  await expect(
    page.getByText("施術時間を1分以上の整数で入力してください。", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "前面に病腺のポイントを追加" })
    .press("Enter");
  await page.getByText("F1", { exact: true }).click();
  await expect(
    page.getByText("温熱（温かい感覚）", { exact: true }),
  ).toBeVisible();
  expect(browserErrors).toEqual([]);
});
