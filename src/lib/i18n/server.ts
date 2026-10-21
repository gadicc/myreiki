import "server-only";
import { setupI18n } from "@lingui/core";
import { setI18n } from "@lingui/react/server";
import { cache } from "react";
import { catalogs } from "./catalogs";
import { getLocale } from "./locale";

export const getRequestI18n = cache(async () => {
  const locale = await getLocale();
  return setupI18n({ locale, messages: catalogs });
});

/** Each translating Server Component initializes Lingui's request-bound context. */
export async function initRequestI18n() {
  const i18n = await getRequestI18n();
  setI18n(i18n);
  return i18n;
}
