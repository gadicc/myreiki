"use client";

import { Trans } from "@lingui/react/macro";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";

export default function About() {
  return (
    <Container sx={{ my: 2 }}>
      <Typography variant="h6">
        <Trans>About</Trans>
      </Typography>
      <p>
        <Trans>
          MyReiki is a simple practice management system for Reiki
          practitioners.
        </Trans>
      </p>
      <p>
        <Trans>
          It is designed to help practitioners manage their clients and
          treatments.
        </Trans>
      </p>
      <p>
        <Trans>It is a work in progress and will be updated regularly.</Trans>
      </p>
    </Container>
  );
}
