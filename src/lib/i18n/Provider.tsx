"use client";
import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { catalogs } from "./catalogs";
import {
  isLocale,
  type Locale,
  localeCookie,
  localeStorage,
} from "./languages";

const LocaleContext = createContext<(locale: Locale) => void>(() => undefined);
export const useSetLocale = () => useContext(LocaleContext);

/** Switch context without remounting forms or mutating a still-hydrating snapshot. */
export function LanguageProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [i18n, setI18n] = useState(() =>
    setupI18n({ locale: initialLocale, messages: catalogs }),
  );
  const setLocale = useCallback((locale: Locale) => {
    if (!isLocale(locale)) return;
    // A cached shell can still be hydrating Suspense children in its old locale.
    // Keep that instance immutable and let React finish hydration before switching.
    startTransition(() =>
      setI18n((previous) =>
        previous.locale === locale
          ? previous
          : setupI18n({ locale, messages: catalogs }),
      ),
    );
    document.documentElement.lang = locale;
    // Non-sensitive UI preference, also read during server rendering.
    try {
      document.cookie = `${localeCookie}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    } catch {
      /* A blocked cookie must not prevent local preference storage. */
    }
    try {
      localStorage.setItem(localeStorage, locale);
    } catch {
      /* Cookie still remembers the choice. */
    }
  }, []);
  useEffect(() => {
    // A cached offline shell may have been rendered before the last language change.
    let saved: unknown;
    try {
      saved = localStorage.getItem(localeStorage);
    } catch {
      /* Storage can be disabled independently of cookies. */
    }
    if (!isLocale(saved)) {
      try {
        saved = document.cookie
          .split(";")
          .map((part) => part.trim())
          .find((part) => part.startsWith(`${localeCookie}=`))
          ?.slice(localeCookie.length + 1);
      } catch {
        /* Use the server-rendered locale when both stores are blocked. */
      }
    }
    if (isLocale(saved)) setLocale(saved);
    const receive = (event: StorageEvent) => {
      if (event.key === localeStorage && isLocale(event.newValue))
        setLocale(event.newValue);
    };
    window.addEventListener("storage", receive);
    return () => window.removeEventListener("storage", receive);
  }, [setLocale]);
  return (
    <LocaleContext.Provider value={setLocale}>
      <I18nProvider i18n={i18n}>{children}</I18nProvider>
    </LocaleContext.Provider>
  );
}
