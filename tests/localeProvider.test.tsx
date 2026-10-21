// @vitest-environment jsdom
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it } from "vitest";
import { localeCookie, localeStorage } from "@/lib/i18n/languages";
import { LanguageProvider, useSetLocale } from "@/lib/i18n/Provider";

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.cookie = `${localeCookie}=; Max-Age=0; Path=/`;
});

it("restores a cookie when local storage has no preference", () => {
  document.cookie = `${localeCookie}=ja; Path=/`;
  render(
    <LanguageProvider initialLocale="en">
      <Editor />
    </LanguageProvider>,
  );
  expect(screen.getByRole("button", { name: "保存" })).toBeTruthy();
});

it("ignores invalid cross-tab locale values and preserves drafts on valid changes", () => {
  render(
    <LanguageProvider initialLocale="en">
      <Editor />
    </LanguageProvider>,
  );
  fireEvent.change(screen.getByLabelText("draft"), {
    target: { value: "keep this draft" },
  });
  act(() =>
    window.dispatchEvent(
      new StorageEvent("storage", { key: localeStorage, newValue: "fr" }),
    ),
  );
  expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
  act(() =>
    window.dispatchEvent(
      new StorageEvent("storage", { key: localeStorage, newValue: "ja" }),
    ),
  );
  expect(screen.getByRole("button", { name: "保存" })).toBeTruthy();
  expect((screen.getByLabelText("draft") as HTMLInputElement).value).toBe(
    "keep this draft",
  );
});
function Editor() {
  const [draft, setDraft] = useState("");
  const setLocale = useSetLocale();
  const { i18n } = useLingui();
  return (
    <>
      <input
        aria-label="draft"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      <button
        type="button"
        onClick={() => setLocale(i18n.locale === "en" ? "ja" : "en")}
      >
        <Trans>Save</Trans>
      </button>
    </>
  );
}
it("switches the active catalog without remounting a draft and restores an offline shell's saved choice", () => {
  const view = render(
    <LanguageProvider initialLocale="en">
      <Editor />
    </LanguageProvider>,
  );
  fireEvent.change(screen.getByLabelText("draft"), {
    target: { value: "Aki 初回 🌱" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(screen.getByRole("button", { name: "保存" })).toBeTruthy();
  expect((screen.getByLabelText("draft") as HTMLInputElement).value).toBe(
    "Aki 初回 🌱",
  );
  expect(document.documentElement.lang).toBe("ja");
  expect(localStorage.getItem(localeStorage)).toBe("ja");
  view.unmount();
  render(
    <LanguageProvider initialLocale="en">
      <Editor />
    </LanguageProvider>,
  );
  expect(screen.getByRole("button", { name: "保存" })).toBeTruthy();
});
