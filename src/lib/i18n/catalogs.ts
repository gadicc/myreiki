import type { Messages } from "@lingui/core";
import { messages as en } from "@/locales/en/messages.mjs";
import { messages as ja } from "@/locales/ja/messages.mjs";
import type { Locale } from "./languages";

// Both small catalogs ship with the shell so language changes also work offline.
export const catalogs: Record<Locale, Messages> = { en, ja };
