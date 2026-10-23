export const languages = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
] as const;
export type Locale = (typeof languages)[number]["code"];
export const localeCookie = "NEXT_LOCALE";
export const localeStorage = "myreiki:locale";

export function isLocale(value: unknown): value is Locale {
  return languages.some(({ code }) => code === value);
}

/** A saved choice wins; unsupported browser languages fall back to English. */
export function resolveLocale(saved?: string, accepted = ""): Locale {
  if (isLocale(saved)) return saved;
  const ranked = accepted
    .split(",")
    .map((part, index) => {
      const [tag, quality] = part.trim().split(";");
      const q = quality ? Number(quality.trim().replace(/^q=/, "")) : 1;
      return { tag: tag.toLowerCase().split("-")[0], q, index };
    })
    .filter(({ q }) => Number.isFinite(q) && q > 0 && q <= 1)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  return (
    (ranked.find(({ tag }) => isLocale(tag))?.tag as Locale | undefined) ?? "en"
  );
}
