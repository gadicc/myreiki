"use client";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";

import { Alert, Button, Container, Stack, TextField } from "@mui/material";
import { useParams, useRouter } from "next/navigation";
import React from "react";
import { usePracticeData } from "@/client-data/Provider";
import { useCanonicalRecordId } from "@/client-data/useCanonicalRecordId";
import { useRecordDraft } from "@/client-data/useRecordDraft";
import ClientOnly from "@/lib/ClientOnly";
import { useForm } from "@/lib/forms";
import { displayError } from "@/lib/i18n/messages";
import { uuidV7 } from "@/lib/uuid";
import { Practice, practiceSchema } from "@/schemas/practice";

export default function PracticeEdit() {
  const { i18n } = useLingui();

  const router = useRouter();
  const data = usePracticeData();
  const userId = data.profile?._id;
  const [saveError, setSaveError] = React.useState("");
  const params = useParams();
  const _id = params?._id;

  const canonicalRecordId = useCanonicalRecordId("practices", _id);
  const existing = data.practices.find((row) => row._id === canonicalRecordId);
  const { draft, acceptSaved } = useRecordDraft(existing);

  async function onSubmit(practice: Practice) {
    if (!userId) return;
    practice.userId = userId;

    try {
      const saved = await data.save(
        "practices",
        { ...practice, _id: practice._id || uuidV7() },
        _id === "new" ? 0 : draft?.version,
      );
      acceptSaved(saved);
      setSaveError("");
      if (_id === "new") router.push(`/practice/edit/${saved._id}`);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Could not save on this device",
      );
      return;
    }
  }

  const { handleSubmit, fr } = useForm<Practice>({
    values: draft,
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

  if (!existing && _id !== "new") return <Trans>Loading or not found...</Trans>;
  if (!userId) return <Trans>Not logged in</Trans>;

  // console.log(formState);

  return (
    <Container sx={{ my: 2 }}>
      {saveError && (
        <Alert severity="error">{displayError(i18n, saveError)}</Alert>
      )}
      <ClientOnly>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={1} direction="column">
            <TextField {...fr("name")} label={i18n._(msg`Name`)} fullWidth />
            <TextField
              {...fr("countryId")}
              label={i18n._(msg`Country Code`)}
              fullWidth
            />
            <TextField
              {...fr("phone")}
              label={i18n._(msg`Phone (Intl +XX)`)}
              fullWidth
            />
            <TextField {...fr("email")} label={i18n._(msg`Email`)} fullWidth />
            <TextField
              {...fr("website")}
              label={i18n._(msg`Website URL`)}
              fullWidth
            />
            <TextField
              {...fr("notes")}
              label={i18n._(msg`Notes`)}
              fullWidth
              multiline
            />
            <Button variant="contained" type="submit">
              <Trans>Submit</Trans>
            </Button>
          </Stack>
        </form>
      </ClientOnly>
    </Container>
  );
}
