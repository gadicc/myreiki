import superjson from "superjson";
import type { Snapshot } from "../../src/data/model";
import { expect, test } from "./fixtures";

test("treatment form, loaded body points, cloning and repeat spreadsheet import", async ({
  page,
  login,
}) => {
  await login();
  const suffix = Date.now(),
    practice = `Synthetic treatment ${suffix}`,
    client = `Aki${suffix}`;
  const settled = () =>
    expect(page.getByText(/changes? saved on this device/)).toHaveCount(0);
  const choosePractice = async () => {
    const select = page.getByRole("combobox", {
      name: "Practice",
      exact: true,
    });
    if (await select.count()) {
      await select.click();
      await page.getByRole("option", { name: practice, exact: true }).click();
    }
  };
  await page.goto("/practice/edit/new");
  await page.getByRole("textbox", { name: "Name", exact: true }).fill(practice);
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page).toHaveURL(/practice\/edit\/[a-f\d-]{36}$/);
  await settled();
  await page.goto("/client/edit/new");
  await choosePractice();
  await page
    .getByRole("textbox", { name: "First name", exact: true })
    .fill(client);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/client\/edit\/[a-f\d-]{36}$/);
  await settled();
  await page.goto("/treatment/edit/new");
  await choosePractice();
  await page
    .getByRole("combobox", { name: "Client", exact: true })
    .fill(client);
  await page.getByRole("option", { name: new RegExp(client) }).click();
  await page
    .getByRole("button", { name: "Add front body point" })
    .press("Enter");
  await page
    .getByRole("textbox", { name: "Notes", exact: true })
    .fill("Synthetic original 初回 🌱");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/treatment\/edit\/[a-f\d-]{36}$/);
  await settled();
  const originalId = new URL(page.url()).pathname.split("/").at(-1)!;
  await page.reload();
  await expect(page.getByText("F1", { exact: true })).toBeVisible();
  await page.goto(`/treatment/edit/new?cloneId=${originalId}`);
  await expect(page.getByText("F1", { exact: true })).toBeVisible();
  await page
    .getByRole("textbox", { name: "Notes", exact: true })
    .fill("Synthetic clone 🌱");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/treatment\/edit\/[a-f\d-]{36}$/);
  await settled();
  const cloneId = new URL(page.url()).pathname.split("/").at(-1)!;
  expect(cloneId).not.toBe(originalId);
  const snapshot = superjson.parse<Snapshot>(
    await (await page.request.get("/api/data")).text(),
  );
  const original = snapshot.treatments.find((t) => t._id === originalId)!,
    clone = snapshot.treatments.find((t) => t._id === cloneId)!;
  expect(original.bodyPoints?.front).toHaveLength(1);
  expect(clone.bodyPoints?.front[0]).toMatchObject({
    treatmentId: cloneId,
    x: 0.5,
    y: 0.5,
  });
  expect(clone.bodyPoints?.front[0]._id).not.toBe(
    original.bodyPoints?.front[0]._id,
  );
  await page.goto("/treatments/import");
  await choosePractice();
  await page
    .getByRole("textbox", { name: "Spreadsheet cells" })
    .fill(`2026-10-21\t${client}\t30\tself\tSynthetic paste 🌱`);
  await page.getByRole("button", { name: "Save import" }).click();
  await expect(
    page.getByText("1 treatments saved on this device.", { exact: true }),
  ).toBeVisible();
  await settled();
  await page.getByRole("button", { name: "Save import" }).click();
  await expect(
    page.getByText("This paste was already saved on this device.", {
      exact: true,
    }),
  ).toBeVisible();
});
