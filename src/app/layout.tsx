import { msg } from "@lingui/core/macro";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import type { Metadata, Viewport } from "next";
import * as React from "react";
import { getLocale } from "@/lib/i18n/locale";
import { LanguageProvider } from "@/lib/i18n/Provider";
import { getRequestI18n } from "@/lib/i18n/server";
import theme from "@/theme";
import ClientProviders from "./clientProviders";
import MyAppBar from "./MyAppBar";

const APP_NAME = "MyReiki";
const APP_DEFAULT_TITLE = "MyReiki";
const APP_TITLE_TEMPLATE = "%s - MyReiki";
const APP_DESCRIPTION = "Reiki Practice Management";

const baseMetadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_DEFAULT_TITLE,
    // startUpImage: [],
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
  icons: {
    icon: "/favicons/android-chrome-512x512.png",
    shortcut: "/favicons/favicon.ico",
    apple: "/favicons/apple-touch-icon.png",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const i18n = await getRequestI18n();
  const description = i18n._(msg`Reiki Practice Management`);
  return {
    ...baseMetadata,
    description,
    openGraph: { ...baseMetadata.openGraph, description },
    twitter: { ...baseMetadata.twitter, description },
  };
}

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
};

export default async function RootLayout(props: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} dir="ltr">
      <head />
      <body>
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <ThemeProvider theme={theme}>
            {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
            <CssBaseline />
            <LanguageProvider initialLocale={locale}>
              <ClientProviders>
                <React.Suspense fallback={null}>
                  <MyAppBar />
                </React.Suspense>
                {props.children}
              </ClientProviders>
            </LanguageProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
