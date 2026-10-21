"use client";
import { Trans } from "@lingui/react/macro";

import { Button, Container } from "@mui/material";
import NextLink from "next/link";
import { usePracticeData } from "@/client-data/Provider";

export default function Practices() {
  const { practices } = usePracticeData();

  return (
    <Container sx={{ my: 2 }}>
      <h1>
        <Trans>Practices</Trans>
      </h1>
      <ol style={{ marginBottom: 30 }}>
        {practices.map((practice) => (
          <li key={practice._id}>
            <NextLink href={"/practice/edit/" + practice._id}>
              {practice.name}
            </NextLink>
          </li>
        ))}
      </ol>
      <Button variant="outlined" component={NextLink} href="/practice/edit/new">
        <Trans>Add New Practice</Trans>
      </Button>
    </Container>
  );
}
