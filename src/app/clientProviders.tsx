"use client";
import { asyncConfirm, ConfirmDialog } from "@gadicc/loom/mui/confirm";
import { LoomPwaLifecycle } from "@gadicc/loom/next/pwa";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { SerwistProvider } from "@serwist/next/react";
import "dayjs/locale/ja";
import { jaJP } from "@mui/x-date-pickers/locales";
import { PracticeDataProvider } from "@/client-data/Provider";

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const { i18n } = useLingui();
  return (
    <SerwistProvider
      swUrl="/sw.js"
      disable={process.env.NODE_ENV === "development"}
      register={false}
      reloadOnOnline={false}
    >
      <LoomPwaLifecycle
        confirmUpdate={() =>
          asyncConfirm({
            text: i18n._(
              msg`A newer version of this web app is available. Reload to update?`,
            ),
            ok: i18n._(msg`Reload`),
            cancel: i18n._(msg`Later`),
          })
        }
        updateCheckIntervalMs={60_000}
      />
      <LocalizationProvider
        dateAdapter={AdapterDayjs}
        adapterLocale={i18n.locale}
        localeText={
          i18n.locale === "ja"
            ? jaJP.components.MuiLocalizationProvider.defaultProps.localeText
            : undefined
        }
      >
        <PracticeDataProvider>{children}</PracticeDataProvider>
        <ConfirmDialog />
      </LocalizationProvider>
    </SerwistProvider>
  );
}
