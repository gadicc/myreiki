import React from "react";
import { Container, Typography } from "@mui/material";

export default function About() {
  return (
    <Container sx={{ my: 2 }}>
      <Typography variant="h6">About</Typography>
      <p>
        MyReiki is a simple practice management system for Reiki practitioners.
      </p>
      <p>
        It is designed to help practitioners manage their clients and
        treatments.
      </p>
      <p>It is a work in progress and will be updated regularly.</p>
      <p>
        (The above was all written by GitHub CoPilot from seeing the codebase,
        cool :)
      </p>
    </Container>
  );
}
