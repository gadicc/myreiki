"use client";
import React from "react";
import { Container, Typography } from "@mui/material";
import { Client, Treatment, clientSchema, treatmentSchema } from "@/schemas";
import { WithId, db, useGongoUserId } from "gongo-client-react";
import usePracticeId from "@/lib/usePracticeId";

const cifmCache = new Map<string, string>();
function clientIdFromName(name: string, practiceId: string) {
  const cached = cifmCache.get(name);
  if (cached) return cached;

  const [givenName, familyName] = name.split(" ");
  const query = { givenName, familyName, practiceId };
  const existingClient = db.collection("clients").findOne(query);
  if (existingClient) {
    cifmCache.set(name, existingClient._id);
    return existingClient._id;
  }

  const doc = { ...query, createdAt: new Date(), __ObjectIDs: ["practiceId"] };
  clientSchema.parse(doc);
  const client = db.collection("clients").insert(doc) as WithId<Client>; // TODO, gongo
  cifmCache.set(name, client._id);
  return client._id;
}

export default function TreatmentsImport() {
  const userId = useGongoUserId();
  const [input, setInput] = React.useState("");
  const [data, setData] = React.useState<
    Array<Omit<Treatment, "clientId"> & { clientName: string }>
  >([]);
  const { practiceId, PracticeSelect } = usePracticeId();

  React.useMemo(() => {
    const lines = input.split("\n");
    if (!lines.length || lines[0] === "") return;

    const treatments = lines.map((line) => {
      const [date, clientName, duration, type, notes] = line.split("\t");
      return {
        date: new Date(date),
        clientName: clientName?.trim(),
        practitionerId: userId || "NO_USER_ID_SET_YET",
        practiceId: practiceId || "NO_PRACTICE_ID_SET_YET",
        duration: parseInt(duration),
        type: (type?.trim() as Treatment["type"]) || "regular",
        notes: notes?.trim(),
        __ObjectIDs: ["practitionerId", "practiceId"],
      };
    });
    setData(treatments);
  }, [input, practiceId, userId]);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!userId) throw new Error("No user ID");
    if (!practiceId) throw new Error("No practice ID");

    const treatments = data.map((_treatment) => {
      const { clientName, ...rest } = _treatment;
      const clientId = clientIdFromName(clientName || "Unknown", practiceId);
      const treatment: Treatment = { ...rest, clientId };
      treatmentSchema.parse(treatment);
      return treatment;
    });
    console.log(treatments);

    for (const treatment of treatments) {
      db.collection("treatments").insert(treatment);
    }
  }

  return (
    <Container sx={{ my: 2 }}>
      <PracticeSelect />
      <Typography variant="h4">Import Treatments</Typography>
      <Typography>
        Copy and paste and relevant cells from a spreadsheet into the box below.
      </Typography>
      <Typography>
        Skip the header row. The columns should be in the following order: Date,
        Receiver, Minutes, Type, Comments / Byosen. Fields should be tab
        separated (automatic when copying from Google Sheets).
      </Typography>
      <form onSubmit={onSubmit}>
        <textarea
          rows={10}
          style={{ width: "100%" }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        ></textarea>
        {/*
      <Typography>
        This page allows you to import treatments from a CSV file.
      </Typography>
      <Typography>
        The CSV file should have the following columns:
      </Typography>
      <ul>
        <li>Date</li>
        <li>Client</li>
        <li>Duration</li>
        <li>Type</li>
        <li>Notes</li>
      </ul>
      <Typography>
        The date should be in the format YYYY-MM-DD. The client should be the
        full name of the client.
      </Typography>
      <Typography>
        The duration should be in minutes. The type should be one of "regular",
        "self", "distance", or "animal".
      </Typography>
      <Typography>
        The notes should be any additional notes about the treatment.
      </Typography>
      <Typography>
        The file should be uploaded below.
      </Typography>
      <input type="file" />
      */}
        <button type="submit">Submit</button>
      </form>
      <p>Preview:</p>
      <table width="100%" border={1} cellSpacing={0} cellPadding={3}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Client</th>
            <th>Duration</th>
            <th>Type</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {data.map((treatment, i) => (
            <tr key={i}>
              <td>{(treatment.date as Date)?.toDateString()}</td>
              <td>{treatment.clientName}</td>
              <td>{treatment.duration}</td>
              <td>{treatment.type}</td>
              <td>{treatment.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Container>
  );
}
