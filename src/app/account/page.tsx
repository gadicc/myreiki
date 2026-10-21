"use client";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";

import { Alert, Button, Container, Stack, Typography } from "@mui/material";
import React from "react";
import superjson from "superjson";
import { practiceDatabase as database } from "@/client-data/database";
import { usePracticeData } from "@/client-data/Provider";
import { displayError } from "@/lib/i18n/messages";

export default function Account() {
  const { i18n } = useLingui();
  const data = usePracticeData();
  const [message, setMessage] = React.useState("");
  const mounted = React.useRef(false);
  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const perform = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (error) {
      if (mounted.current)
        setMessage(
          error instanceof Error
            ? error.message
            : "The device operation failed. Your saved work is retained.",
        );
    }
  };
  if (!data.profile || !data.binding)
    return (
      <Container>
        <Trans>Sign in to open your account.</Trans>
      </Container>
    );
  const binding = data.binding,
    profile = data.profile;
  return (
    <Container sx={{ my: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h5">
          <Trans>Account</Trans>
        </Typography>
        <Typography>
          {profile.displayName} · {profile.email}
        </Typography>
        {message && (
          <Alert severity="info">{displayError(i18n, message)}</Alert>
        )}
        <Typography variant="h6">
          <Trans>Practitioner mode</Trans>
        </Typography>
        <Button
          variant="outlined"
          onClick={async () => {
            try {
              const response = await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  expectedActorId: binding.owner,
                  practitioner: !profile.practitioner,
                }),
              });
              if (!response.ok)
                throw new Error(
                  "Connect and sign in again before changing this setting.",
                );
              await data.sync();
            } catch (error) {
              setMessage(
                error instanceof Error
                  ? error.message
                  : "Could not update setting",
              );
            }
          }}
        >
          {displayError(i18n, profile.practitioner ? "Turn off" : "Turn on")}
        </Button>
        <Typography variant="h6">
          <Trans>Offline records</Trans>
        </Typography>
        <Typography>
          <Trans>
            Saved records and edits remain available offline until you sign out
            or remove this device's data. Browsers can erase local storage, so
            synchronize and keep private backups.
          </Trans>
        </Typography>
        <Button
          onClick={() =>
            perform(async () => {
              const persisted = await navigator.storage?.persist?.();
              if (mounted.current)
                setMessage(
                  persisted
                    ? "The browser granted persistent storage."
                    : "Persistent storage was not granted. Pending work is still saved locally.",
                );
            })
          }
        >
          <Trans>Request persistent storage</Trans>
        </Button>
        <Button
          onClick={() =>
            perform(async () => {
              const exported = await database.exportDevice(binding);
              await database.assertBinding(binding);
              if (!mounted.current) return;
              const url = URL.createObjectURL(
                new Blob([superjson.stringify(exported)], {
                  type: "application/json",
                }),
              );
              const link = document.createElement("a");
              link.href = url;
              link.download = "myreiki-private-device-backup.json";
              link.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            })
          }
        >
          <Trans>Export my device records and pending work</Trans>
        </Button>
        <Typography>
          <Trans>
            Exports include private client notes. Store them privately.
          </Trans>
        </Typography>
        <Button
          color="error"
          onClick={() =>
            perform(async () => {
              if (
                !confirm(
                  i18n._(
                    msg`Remove this account's saved records and ${data.pending.length} pending change(s) from this device? Export anything you need first.`,
                  ),
                )
              )
                return;
              await database.forget(binding);
              await data.signOut();
            })
          }
        >
          <Trans>Remove my data from this device</Trans>
        </Button>
      </Stack>
    </Container>
  );
}
