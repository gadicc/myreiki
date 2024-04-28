"use client";

import React from "react";
// import { t, Trans } from "@lingui/macro";
import { useGongoSub, useGongoLive, db } from "gongo-client-react";
import { TableVirtuoso, TableComponents } from "react-virtuoso";

import {
  Box,
  Container,
  Fab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Add } from "@mui/icons-material";

import { Treatment, Client } from "@/schemas";
import usePracticeId from "../../lib/usePracticeId";
import NextLink from "next/link";

type TreatmentWithClient = Treatment & { client?: Client | null };

const VirtuosoTableComponents: TableComponents<TreatmentWithClient> = {
  // eslint-disable-next-line react/display-name
  Scroller: React.forwardRef<HTMLDivElement>((props, ref) => (
    <TableContainer component={Paper} {...props} ref={ref} />
  )),
  Table: (props) => (
    <Table
      {...props}
      sx={{ borderCollapse: "separate", tableLayout: "fixed" }}
    />
  ),
  // @ts-expect-error: todo
  TableHead,
  TableRow: ({ item: _item, ...props }) => <TableRow {...props} />,
  // eslint-disable-next-line react/display-name
  TableBody: React.forwardRef<HTMLTableSectionElement>((props, ref) => (
    <TableBody {...props} ref={ref} />
  )),
};

function fixedHeaderContent() {
  const sx = {
    backgroundColor: "background.paper",
  };
  return (
    <TableRow>
      <TableCell sx={{ ...sx, width: 90 }} variant="head">
        Date
      </TableCell>
      <TableCell sx={sx} variant="head">
        Client
      </TableCell>
      <TableCell sx={sx} variant="head">
        Duration
      </TableCell>
    </TableRow>
  );
}

function rowContent(_index: number, treatment: TreatmentWithClient) {
  const client = treatment.client || { givenName: "Unknown", familyName: "" };
  /*
  function onClick(userId: string, field: string, oldValue: number) {
    return function () {
      const textValue = prompt("New Value?  Was: " + oldValue);
      if (!textValue) return alert("Invalid value");
      const newValue = parseFloat(textValue);
      const query = { $set: { [field]: newValue } };
      db.collection("users").update(userId, query);
    };
  }
  */

  return (
    <React.Fragment>
      <TableCell>{(treatment.date as Date).toLocaleDateString()}</TableCell>
      <TableCell component="th" scope="row">
        {client.givenName} {client.familyName}
      </TableCell>
      <TableCell>{treatment.duration}</TableCell>
    </React.Fragment>
  );
}

export function useClientTreatments(practiceId: string) {
  useGongoSub(practiceId && "clientsForPractice", { _id: practiceId });
  useGongoSub(practiceId && "treatmentsForPractice", { _id: practiceId });

  const _clients = useGongoLive((db) =>
    db.collection("clients").find({ practiceId }),
  );
  const _treatments = useGongoLive((db) =>
    db.collection("treatments").find({ practiceId }),
  );
  const combined = React.useMemo(
    () =>
      _treatments.map((treatment) => {
        const client =
          _clients &&
          db.collection("clients").findOne({ _id: treatment.clientId });
        return { ...treatment, client };
      }),
    [_treatments, _clients],
  );

  return combined;
}

export default function Clients() {
  const { practiceId, PracticeSelect } = usePracticeId();
  const combined = useClientTreatments(practiceId);

  const [filter, setFilter] = React.useState("");
  const treatments = React.useMemo(() => {
    const re = new RegExp(filter, "i");
    return combined.filter((treatment) => {
      if (!filter) return true;
      const client = treatment.client;
      if (client) {
        if (re.test(client.givenName)) return true;
        if (client.familyName && re.test(client.familyName)) return true;
        if (client.phone && re.test(client.phone)) return true;
        if (client.email && re.test(client.email)) return true;
        if (client.notes && re.test(client.notes)) return true;
      }
      return false;
    });
  }, [combined, filter]);

  return (
    <Container maxWidth="lg" sx={{ my: 2 }}>
      <Box>
        <PracticeSelect />
        <br />
        <br />

        <Typography variant="h6">Treatments</Typography>
        <TextField
          size="small"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />

        <p>Total treatments: {treatments.length}</p>
        {/* sub.isMore && <Button onClick={sub.loadMore}>Load More</Button> */}

        <Paper style={{ height: "80vh", width: "100%" }}>
          <TableVirtuoso
            data={treatments}
            components={VirtuosoTableComponents}
            fixedHeaderContent={fixedHeaderContent}
            itemContent={rowContent}
          />
        </Paper>
        <Fab
          sx={{ position: "fixed", bottom: 16, right: 16 }}
          color="primary"
          component={NextLink}
          href="/treatment/edit/new"
        >
          <Add sx={{ fontSize: "200%" }} />
        </Fab>
      </Box>
    </Container>
  );
}
