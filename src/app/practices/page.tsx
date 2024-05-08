"use client";
import React from "react";
import { useGongoUserId, useGongoLive } from "gongo-client-react";
import { Button, Container } from "@mui/material";
import NextLink from "next/link";

export default function Practices() {
  const userId = useGongoUserId();
  const practices = useGongoLive((db) =>
    db.collection("practices").find({ userId }),
  );

  return (
    <Container sx={{ my: 2 }}>
      <h1>Practices</h1>
      <ol style={{ marginBottom: 30 }}>
        {practices.map((practice) => (
          <li key={practice._id}>
            <a href={"/practice/edit/" + practice._id}>{practice.name}</a>
          </li>
        ))}
      </ol>
      <Button variant="outlined" component={NextLink} href="/practice/edit/new">
        Add New Practice
      </Button>
    </Container>
  );
}
