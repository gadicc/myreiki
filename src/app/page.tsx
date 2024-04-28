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

function HomePage() {
  return <Container>Home</Container>;
}

export default function Index() {
  const [value, setValue] = React.useState(0);

  return (
    <Container sx={{ my: 2 }}>
      {value === 0 && <HomePage />}
      {value === 1 && <TreatmentsPage />}
      {value === 2 && <ClientsPage />}
      <div style={{ height: 56 }} />
      <BottomNavigation
        showLabels
        value={value}
        onChange={(event, newValue) => {
          setValue(newValue);
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
