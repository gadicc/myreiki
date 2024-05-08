"use client";
import React from "react";
import { Button, Container, Typography } from "@mui/material";
import { db, useGongoOne, useGongoUserId } from "gongo-client-react";

export default function Account() {
  const userId = useGongoUserId();
  const user = useGongoOne((db) =>
    db.collection("users").find({ _id: userId }),
  );
  const isPractitioner = user?.practitioner;

  return (
    <Container sx={{ my: 2 }}>
      <Typography variant="h6">Account</Typography>
      <p>Coming soon.</p>
      <br />

      <Typography variant="h6">Practioner Mode</Typography>
      <Button
        variant="outlined"
        sx={{ marginTop: 1 }}
        onClick={() =>
          userId &&
          db
            .collection("users")
            .update(userId, { $set: { practitioner: !isPractitioner } })
        }
      >
        {isPractitioner ? "TURN OFF" : "TURN ON"}
      </Button>
    </Container>
  );
}
