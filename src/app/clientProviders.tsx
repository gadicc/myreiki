"use client";
import { asyncConfirm, ConfirmDialog } from "@gadicc/loom/mui/confirm";
import { LoomPwaLifecycle } from "@gadicc/loom/next/pwa";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { SerwistProvider } from "@serwist/next/react";
import { PracticeDataProvider } from "@/client-data/Provider";

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SerwistProvider
      swUrl="/sw.js"
      disable={process.env.NODE_ENV === "development"}
      register={false}
      reloadOnOnline={false}
    >
      <LoomPwaLifecycle
        confirmUpdate={() =>
          asyncConfirm(
            "A newer version of this web app is available. Reload to update?",
          )
        }
        updateCheckIntervalMs={60_000}
      />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <PracticeDataProvider>{children}</PracticeDataProvider>
        <ConfirmDialog />
      </LocalizationProvider>
    </SerwistProvider>
  );
}
