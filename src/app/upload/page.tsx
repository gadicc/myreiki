"use client";

import { Trans } from "@lingui/react/macro";
import { Container, Typography } from "@mui/material";
export default function UploadPage() {
  return (
    <Container sx={{ my: 2 }}>
      <Typography variant="h5">
        <Trans>Uploads</Trans>
      </Typography>
      <Typography>
        <Trans>File uploads are not enabled in MyReiki.</Trans>
      </Typography>
    </Container>
  );
}
