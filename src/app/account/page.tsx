"use client";
import { Alert, Button, Container, Stack, Typography } from "@mui/material";
import React from "react";
import superjson from "superjson";
import { practiceDatabase as database } from "@/client-data/database";
import { usePracticeData } from "@/client-data/Provider";

export default function Account() {
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
    return <Container>Sign in to open your account.</Container>;
  const binding = data.binding,
    profile = data.profile;
  return (
    <Container sx={{ my: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h5">Account</Typography>
        <Typography>
          {profile.displayName} · {profile.email}
        </Typography>
        {message && <Alert severity="info">{message}</Alert>}
        <Typography variant="h6">Practitioner mode</Typography>
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
          {profile.practitioner ? "Turn off" : "Turn on"}
        </Button>
        <Typography variant="h6">Offline records</Typography>
        <Typography>
          Saved records and edits remain available offline until you sign out or
          remove this device's data. Browsers can erase local storage, so
          synchronize and keep private backups.
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
          Request persistent storage
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
          Export my device records and pending work
        </Button>
        <Typography>
          Exports include private client notes. Store them privately.
        </Typography>
        <Button
          color="error"
          onClick={() =>
            perform(async () => {
              if (
                !confirm(
                  `Remove this account's saved records and ${data.pending.length} pending change(s) from this device? Export anything you need first.`,
                )
              )
                return;
              await database.forget(binding);
              await data.signOut();
            })
          }
        >
          Remove my data from this device
        </Button>
      </Stack>
    </Container>
  );
}
