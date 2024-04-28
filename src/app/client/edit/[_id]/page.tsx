"use client";
import React from "react";
import {
  db,
  useGongoOne,
  useGongoSub,
  useGongoUserId,
  OptionalId,
} from "gongo-client-react";
import { useParams, useRouter } from "next/navigation";
import { Button, Container, Stack, TextField } from "@mui/material";

import { clientSchema, Client } from "@/schemas";
import ClientOnly from "@/lib/ClientOnly";
import { useForm } from "@/lib/forms";
import usePracticeId from "@/lib/usePracticeId";

export default function ClientEdit() {
  const router = useRouter();
  const userId = useGongoUserId();
  const params = useParams();
  const { practiceId, PracticeSelect } = usePracticeId();
  const _id = params?._id;

  useGongoSub(_id === "new" ? false : "client", { _id });
  const existing = useGongoOne((db) => db.collection("clients").find({ _id }));

  const {
    handleSubmit,
    formState: { isDirty },
    fr,
  } = useForm<Client>({
    values: existing || undefined,
    schema: clientSchema,
    defaultValues: {
      practiceId: practiceId || "",
      givenName: "",
      familyName: "",
      phone: "",
      email: "",
      notes: "",
    },
  });

  function onSubmit(
    client: OptionalId<Client>,
    _event?: React.BaseSyntheticEvent,
  ) {
    if (!practiceId) return;
    client.practiceId = practiceId;
    if (!client.__ObjectIDs) client.__ObjectIDs = ["practiceId"];

    // console.log(client);
    // return;

    if (_id === "new") {
      const insertedDoc = db.collection("clients").insert(client);
      router.push(`/client/edit/${insertedDoc._id}`);
    } else {
      db.collection("clients").update({ _id }, { $set: client });
    }

    const event = _event as
      | React.SyntheticEvent<HTMLFormElement, SubmitEvent>
      | undefined;
    const submitter = (
      event as React.SyntheticEvent<HTMLFormElement, SubmitEvent>
    )?.nativeEvent?.submitter;
    const dest = submitter?.getAttribute("data-dest");
    if (dest === "back") router.back();
  }

  if (!existing && _id !== "new") return "Loading or not found...";
  if (!userId) return "Not logged in";

  // console.log(formState);

  return (
    <Container sx={{ my: 2 }}>
      <ClientOnly>
        <PracticeSelect />
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={1} direction="column">
            <TextField {...fr("givenName")} label="First name" fullWidth />
            <TextField {...fr("familyName")} label="Family name" fullWidth />
            <TextField {...fr("phone")} label="Phone (Intl +XX)" fullWidth />
            <TextField {...fr("email")} label="Email" fullWidth />
            <TextField {...fr("notes")} label="Notes" fullWidth multiline />

            <Stack spacing={1} direction="row">
              <Button
                variant="outlined"
                type="submit"
                fullWidth
                disabled={!isDirty}
              >
                Save
              </Button>
              <Button
                variant="contained"
                type="submit"
                fullWidth
                data-dest="back"
                disabled={!isDirty}
              >
                Save & Back
              </Button>
            </Stack>
          </Stack>
        </form>
      </ClientOnly>
    </Container>
  );
}
