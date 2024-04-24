"use client";

import React from "react";
// import { t, Trans } from "@lingui/macro";
import { useGongoSub, useGongoLive } from "gongo-client-react";

import {
  Box,
  Container,
  IconButton,
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
import { TableVirtuoso, TableComponents } from "react-virtuoso";

import { Client } from "@/schemas/client";
import usePracticeId from "../../lib/usePracticeId";
import Link from "@/lib/link";
import { Edit } from "@mui/icons-material";

const VirtuosoTableComponents: TableComponents<Client> = {
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
      <TableCell sx={sx} variant="head">
        Client
      </TableCell>
      <TableCell sx={sx} variant="head">
        Actions
      </TableCell>
    </TableRow>
  );
}

function rowContent(_index: number, client: Client) {
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
      <TableCell component="th" scope="row">
        {client.givenName} {client.familyName}
        <br />
        {client.email}
      </TableCell>
      <TableCell>
        <Link href={`/client/edit/${client._id}`}>
          <IconButton size="small">
            <Edit />
          </IconButton>
        </Link>
      </TableCell>
    </React.Fragment>
  );
}

export default function Clients() {
  const { practiceId, PracticeSelect } = usePracticeId();

  useGongoSub("clientsForPractice", { _id: practiceId });
  const [filter, setFilter] = React.useState("");
  const _clients = useGongoLive((db) =>
    db.collection("clients").find({ practiceId }),
  );
  const clients = React.useMemo(() => {
    const re = new RegExp(filter, "i");
    return _clients.filter((client) => {
      if (!filter) return true;
      if (re.test(client.givenName)) return true;
      if (re.test(client.familyName)) return true;
      if (client.phone && re.test(client.phone)) return true;
      if (client.email && re.test(client.email)) return true;
      if (client.notes && re.test(client.notes)) return true;
      // for (const email of user.emails) if (re.test(email.value)) return true;
      // if (user.username && re.test(user.username)) return true;
      return false;
    });
  }, [_clients, filter]);

  return (
    <Container maxWidth="lg" sx={{ my: 2 }}>
      <Box>
        <PracticeSelect />
        <br />
        <br />

        <Typography variant="h6">Clients</Typography>
        <TextField
          size="small"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />

        <p>Total clients: {clients.length}</p>
        {/* sub.isMore && <Button onClick={sub.loadMore}>Load More</Button> */}

        <Paper style={{ height: "80vh", width: "100%" }}>
          <TableVirtuoso
            data={clients}
            components={VirtuosoTableComponents}
            fixedHeaderContent={fixedHeaderContent}
            itemContent={rowContent}
          />
        </Paper>
      </Box>
    </Container>
  );
}
