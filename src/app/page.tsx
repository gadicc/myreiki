"use client";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";

import { Dry, Groups, Home } from "@mui/icons-material";

import { BottomNavigation, BottomNavigationAction, Box } from "@mui/material";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import ClientsPage from "@/app/clients/page";
import TreatmentsPage from "@/app/treatments/page";
import HomePage from "./home";

function Index() {
  const { i18n } = useLingui();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab =
    (searchParams &&
      searchParams.has("tab") &&
      parseInt(searchParams.get("tab")!)) ||
    0;

  const createQueryString = React.useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams?.toString());
      params.set(name, value);
      return params.toString();
    },
    [searchParams],
  );

  const setTab = (tabIdx: number) =>
    router.push(pathname + "?" + createQueryString("tab", tabIdx.toString()));

  return (
    <Box>
      {tab === 0 && <HomePage />}
      {tab === 1 && <TreatmentsPage />}
      {tab === 2 && <ClientsPage />}
      <div style={{ height: 56 }} />
      <BottomNavigation
        showLabels
        value={tab}
        onChange={(event, newValue) => {
          setTab(newValue);
        }}
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#ccccff",
        }}
      >
        <BottomNavigationAction label={i18n._(msg`Home`)} icon={<Home />} />
        <BottomNavigationAction
          label={i18n._(msg`Treatments`)}
          icon={<Dry />}
        />
        <BottomNavigationAction
          label={i18n._(msg`Clients`)}
          icon={<Groups />}
        />
      </BottomNavigation>
    </Box>
  );
}

export default function WrappedIndex() {
  // https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout
  return (
    <React.Suspense>
      <Index />
    </React.Suspense>
  );
}
