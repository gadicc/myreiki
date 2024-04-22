"use client";
import React from "react";
import { Button, Container, Stack, TextField } from "@mui/material";

import { practiceSchema, Practice } from "@/schemas/practice";
import ClientOnly from "@/lib/ClientOnly";
import {
  db,
  useGongoOne,
  useGongoSub,
  useGongoUserId,
  OptionalId,
} from "gongo-client-react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "@/lib/forms";

export default function PracticeEdit() {
  const router = useRouter();
  const userId = useGongoUserId();
  const params = useParams();
  const _id = params?._id;

  useGongoSub(_id === "new" ? false : "practice", { _id });
  const existing = useGongoOne((db) =>
    db.collection("practices").find({ _id }),
  );

  function onSubmit(practice: OptionalId<Practice>) {
    if (!userId) return;
    practice.userId = userId;
    if (!practice.__ObjectIDs) practice.__ObjectIDs = ["userId"];

    if (_id === "new") {
      const insertedDoc = db.collection("practices").insert(practice);
      router.push(`/practice/edit/${insertedDoc._id}`);
    } else {
      db.collection("practices").update({ _id }, { $set: practice });
    }
  }

  const { handleSubmit, fr } = useForm<Practice>({
    values: existing || undefined,
    schema: practiceSchema,
    defaultValues: {
      _id: "",
      userId: userId || "",
      name: "",
      countryId: "",
      phone: "",
      email: "",
      website: "",
      notes: "",
    },
  });

  if (!existing && _id !== "new") return "Loading or not found...";
  if (!userId) return "Not logged in";

  // console.log(formState);

  return (
    <Container sx={{ my: 2 }}>
      <ClientOnly>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={1} direction="column">
            <TextField {...fr("name")} label="Name" fullWidth />
            <TextField {...fr("countryId")} label="Country Code" fullWidth />
            <TextField {...fr("phone")} label="Phone (Intl +XX)" fullWidth />
            <TextField {...fr("email")} label="Email" fullWidth />
            <TextField {...fr("website")} label="Website URL" fullWidth />
            <TextField {...fr("notes")} label="Notes" fullWidth multiline />
            <Button variant="contained" type="submit">
              Submit
            </Button>
          </Stack>
        </form>
      </ClientOnly>
    </Container>
  );
}
