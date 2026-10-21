import { readFileSync } from "node:fs";
import { setupI18n } from "@lingui/core";
import { formatter } from "@lingui/format-po";
import { describe, expect, it } from "vitest";
import { catalogs } from "@/lib/i18n/catalogs";
import { formatTreatmentDate } from "@/lib/i18n/dates";
import { resolveLocale } from "@/lib/i18n/languages";
import { displayError } from "@/lib/i18n/messages";
import { reikiTypes } from "@/lib/i18n/treatmentTypes";

describe("English and Japanese localization", () => {
  it("formats recent and older list dates without depending on which route loaded first", () => {
    const now = new Date(2026, 9, 21, 12, 0),
      recent = new Date(2026, 9, 20, 9, 30);
    expect(formatTreatmentDate(new Date(2026, 9, 21, 9, 30), "ja", now)).toBe(
      "09:30",
    );
    expect(formatTreatmentDate(recent, "ja", now)).toBe("10月20日 (火)");
    expect(formatTreatmentDate(recent, "en", now)).toBe("Tue 20th");
    expect(formatTreatmentDate(new Date(2026, 8, 1), "ja", now)).toBe("9月1日");
  });
  it("prefers a valid saved locale, negotiates language tags and rejects invalid quality values", () => {
    expect(resolveLocale("en", "ja-JP")).toBe("en");
    expect(resolveLocale("ja", "en-GB")).toBe("ja");
    expect(resolveLocale("fr", "de, en-GB;q=0.8, ja;q=0.9")).toBe("ja");
    expect(resolveLocale(undefined, "ja;q=0,en-GB;q=0.5")).toBe("en");
    expect(resolveLocale(undefined, "ja;q=NaN,ja;q=2")).toBe("en");
    expect(resolveLocale(undefined, "fr-FR")).toBe("en");
  });
  it("translates errors, import row numbers and saved counts without exposing unknown technical messages", () => {
    const en = setupI18n({ locale: "en", messages: catalogs });
    const ja = setupI18n({ locale: "ja", messages: catalogs });
    const error = new Error(
      "Account changed; reopen the record before saving.",
    );
    expect(displayError(en, error)).toBe(error.message);
    expect(displayError(ja, error)).toBe(
      "アカウントが変わりました。記録を開き直してから保存してください。",
    );
    expect(displayError(ja, new Error("Row 12: invalid date."))).toBe(
      "12行目：日付が正しくありません。",
    );
    expect(displayError(ja, "3 treatments saved on this device.")).toBe(
      "この端末に施術記録を3件保存しました。",
    );
    expect(
      displayError(ja, new Error("postgres secret=private")),
    ).not.toContain("private");
    expect(displayError(ja, "toString")).not.toContain("function");
    expect(ja._(reikiTypes.psychological)).toBe("性癖改善");
    expect(en._(reikiTypes.psychological)).toBe("Psychological");
  });
  it("keeps every Japanese catalog entry translated and free of fuzzy review markers", () => {
    const po = readFileSync("src/locales/ja/messages.po", "utf8");
    const entries = formatter().parse(po, {
      locale: "ja",
      sourceLocale: "en",
      filename: "src/locales/ja/messages.po",
    });
    expect(Object.keys(entries).length).toBeGreaterThan(150);
    expect(
      Object.entries(entries).filter(
        ([, entry]) => !entry.translation || entry.obsolete,
      ),
    ).toEqual([]);
    expect(po).not.toMatch(/^#,.*fuzzy/m);
  });
});
