"use client";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";

import {
  Alert,
  Button,
  Container,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import React from "react";
import { practiceDatabase as database } from "@/client-data/database";
import { usePracticeData } from "@/client-data/Provider";
import { parseSpreadsheet } from "@/data/spreadsheet";
import { displayError } from "@/lib/i18n/messages";
import { reikiTypes } from "@/lib/i18n/treatmentTypes";
import usePracticeId from "@/lib/usePracticeId";

export default function TreatmentsImport() {
  const { i18n } = useLingui();

  const data = usePracticeData();
  const { practiceId, PracticeSelect } = usePracticeId();
  const [input, setInput] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const preview = React.useMemo(() => {
    try {
      return { rows: parseSpreadsheet(input), error: "" };
    } catch (error) {
      return {
        rows: [],
        error: error instanceof Error ? error.message : "Invalid paste",
      };
    }
  }, [input]);
  if (!data.binding)
    return (
      <Container>
        <Trans>Sign in to import treatments.</Trans>
      </Container>
    );
  const binding = data.binding;
  return (
    <Container sx={{ my: 2 }}>
      <Typography variant="h4">
        <Trans>Import Reiki treatments</Trans>
      </Typography>
      <PracticeSelect />
      <Typography>
        <Trans>
          Paste tab-separated cells, without a header: date (YYYY-MM-DD, or ISO
          date and time with timezone), full client name, whole minutes, Reiki
          type, notes. All rows are checked before saving.
        </Trans>
      </Typography>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          try {
            const digest = Array.from(
              new Uint8Array(
                await crypto.subtle.digest(
                  "SHA-256",
                  new TextEncoder().encode(input),
                ),
              ),
              (byte) => byte.toString(16).padStart(2, "0"),
            ).join("");
            const result = await database.importSpreadsheet(
              binding,
              practiceId,
              preview.rows,
              digest,
            );
            setMessage(
              result.repeated
                ? "This paste was already saved on this device."
                : `${result.imported} treatments saved on this device.`,
            );
            void data.sync();
          } catch (error) {
            setMessage(
              error instanceof Error ? error.message : "Could not save import",
            );
          } finally {
            setSaving(false);
          }
        }}
      >
        <TextField
          label={i18n._(msg`Spreadsheet cells`)}
          multiline
          minRows={8}
          fullWidth
          value={input}
          disabled={saving}
          onChange={(event) => setInput(event.target.value)}
          sx={{ my: 2 }}
        />
        {preview.error && (
          <Alert severity="error">{displayError(i18n, preview.error)}</Alert>
        )}
        {message && (
          <Alert severity="info">{displayError(i18n, message)}</Alert>
        )}
        <Button
          type="submit"
          variant="contained"
          disabled={
            saving || !practiceId || !preview.rows.length || !!preview.error
          }
        >
          <Trans>Save import</Trans>
        </Button>
      </form>
      <Typography variant="h6" sx={{ mt: 2 }}>
        <Trans>Preview</Trans>
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            {[msg`Date`, msg`Client`, msg`Minutes`, msg`Type`, msg`Notes`].map(
              (title) => (
                <TableCell key={title.id}>{i18n._(title)}</TableCell>
              ),
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {preview.rows.map((row, index) => (
            <TableRow key={index}>
              <TableCell>{row.date.toISOString()}</TableCell>
              <TableCell>{row.clientName}</TableCell>
              <TableCell>{row.duration}</TableCell>
              <TableCell>{i18n._(reikiTypes[row.reikiType])}</TableCell>
              <TableCell sx={{ whiteSpace: "pre-wrap" }}>{row.notes}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Container>
  );
}
