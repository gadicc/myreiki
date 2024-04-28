"use client";
import * as React from "react";

import {
  BottomNavigation,
  BottomNavigationAction,
  Container,
} from "@mui/material";
import { Dry, Groups, Home } from "@mui/icons-material";

import TreatmentsPage from "@/app/treatments/page";
import ClientsPage from "@/app/clients/page";
import HomePage from "./home";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function Index() {
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
    <Container sx={{ my: 2 }}>
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
        <BottomNavigationAction label="Home" icon={<Home />} />
        <BottomNavigationAction label="Treatments" icon={<Dry />} />
        <BottomNavigationAction label="Clients" icon={<Groups />} />
      </BottomNavigation>
    </Container>
  );
}
