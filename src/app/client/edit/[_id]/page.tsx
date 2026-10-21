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
import usePracticeId from "@/lib/usePracticeId";
import { uuidV7 } from "@/lib/uuid";
import { Client, clientSchema } from "@/schemas";

export default function ClientEdit() {
  const { i18n } = useLingui();

  const router = useRouter();
  const data = usePracticeData();
  const userId = data.profile?._id;
  const [saveError, setSaveError] = React.useState("");
  const params = useParams();
  const { practiceId, setPracticeId, PracticeSelect } = usePracticeId();
  const _id = params?._id;

  const canonicalRecordId = useCanonicalRecordId("clients", _id);
  const existing = data.clients.find((row) => row._id === canonicalRecordId);
  const { draft, acceptSaved } = useRecordDraft(existing);
  React.useEffect(() => {
    if (existing) setPracticeId(existing.practiceId);
  }, [existing?.practiceId, setPracticeId]);

  const {
    handleSubmit,
    formState: { isDirty },
    fr,
  } = useForm<Client>({
    values: draft,
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

  async function onSubmit(client: Client, _event?: React.BaseSyntheticEvent) {
    if (!practiceId) return;
    client.practiceId = existing?.practiceId || practiceId;

    // console.log(client);
    // return;

    try {
      const saved = await data.save(
        "clients",
        { ...client, _id: client._id || uuidV7() },
        _id === "new" ? 0 : draft?.version,
      );
      acceptSaved(saved);
      setSaveError("");
      if (_id === "new") router.push(`/client/edit/${saved._id}`);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Could not save on this device",
      );
      return;
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

  if (!existing && _id !== "new") return <Trans>Loading or not found...</Trans>;
  if (!userId) return <Trans>Not logged in</Trans>;

  // console.log(formState);

  return (
    <Container sx={{ my: 2 }}>
      {saveError && (
        <Alert severity="error">{displayError(i18n, saveError)}</Alert>
      )}
      <ClientOnly>
        {!existing && <PracticeSelect />}
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={1} direction="column">
            <TextField
              {...fr("givenName")}
              label={i18n._(msg`First name`)}
              fullWidth
            />
            <TextField
              {...fr("familyName")}
              label={i18n._(msg`Family name`)}
              fullWidth
            />
            <TextField
              {...fr("phone")}
              label={i18n._(msg`Phone (Intl +XX)`)}
              fullWidth
            />
            <TextField {...fr("email")} label={i18n._(msg`Email`)} fullWidth />
            <TextField
              {...fr("notes")}
              label={i18n._(msg`Notes`)}
              fullWidth
              multiline
            />

            <Stack spacing={1} direction="row">
              <Button
                variant="outlined"
                type="submit"
                fullWidth
                disabled={!isDirty}
              >
                <Trans>Save</Trans>
              </Button>
              <Button
                variant="contained"
                type="submit"
                fullWidth
                data-dest="back"
                disabled={!isDirty}
              >
                <Trans>Save & Back</Trans>
              </Button>
            </Stack>
          </Stack>
        </form>
      </ClientOnly>
    </Container>
  );
}
