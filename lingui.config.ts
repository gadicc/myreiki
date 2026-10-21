import { formatter } from "@lingui/format-po";

/** @type {import("@lingui/conf").LinguiConfig} */
export default {
  locales: ["en", "ja"],
  sourceLocale: "en",
  compileNamespace: "es",
  fallbackLocales: { default: "en" },
  catalogs: [
    {
      path: "<rootDir>/src/locales/{locale}/messages",
      include: ["<rootDir>/src/**/*.{ts,tsx}"],
    },
  ],
  format: formatter({ lineNumbers: false }),
};
