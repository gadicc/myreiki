"use client";

import React from "react";
// import { t, Trans } from "@lingui/macro";
import { useGongoSub, useGongoLive } from "gongo-client-react";
import { Virtuoso } from "react-virtuoso";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import Highlighter from "react-highlight-words";
import dayjs from "dayjs";
import { db } from "gongo-client-react";

import {
  Box,
  Fab,
  Container,
  IconButton,
  TextField,
  Stack,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
} from "@mui/material";
import { Add, Edit } from "@mui/icons-material";

import Link from "@/lib/link";
import { ClientAvatar } from "./clientUtils";
import { Client, Treatment } from "@/schemas";
import usePracticeId from "../../lib/usePracticeId";

function clientRow(
  _index: number,
  client: Client & { lastTreatment?: Treatment },
  context: { filterRegExp: RegExp; sortBy: string },
) {
  const now = dayjs();

  const lastTreatment = client.lastTreatment;

  const date = lastTreatment && dayjs(lastTreatment.date);
  let dateStr;
  if (date) {
    if (date.isToday()) dateStr = date.format("HH:mm");
    else if (now.diff(date, "days") < 7) dateStr = date.format("ddd Do");
    else if (date.year() === now.year()) dateStr = date.format("D MMM");
    else dateStr = (lastTreatment.date as Date).toLocaleDateString();
  } else {
    dateStr = "";
  }

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
    <div className="treatmentRow" role="listitem">
      <style jsx>{`
        .treatmentRow {
          /* height: 64px; */
          padding-top: 6px;
          padding-bottom: 5px;
          border-top: 1px solid #ddd;
          box-sizing: border-box;
        }
        /* Common to allow the below */
        .treatmentRow > div {
          display: inline-block;
          vertical-align: top;
          height: 100%;
          font-size: 14.875px;
        }
        .avatarAndDuration {
          width: 40px;
          box-sizing: content-box;
          text-align: center;
          position: relative;
        }
        .clientAndNotes {
          width: calc(100% - 40px - 20px - 95px);
          box-sizing: content-box;
          padding-left: 20px;
        }
        .dateAndActions {
          width: 95px;
          text-align: right;
        }
      `}</style>
      <div className="avatarAndDuration">
        <ClientAvatar client={client} />
        {/*
        <div
          style={{
            width: "100%",
            position: "absolute",
            textAlign: "center",
            left: 0,
            bottom: 0,
          }}
        >
          <span
            style={{
              borderRadius: 5,
              background: "#777",
              color: "#eee",
              padding: "2px 4px 2px 4px",
              fontSize: "70%",
            }}
          >
            {treatment.duration}m
          </span>
        </div>
        */}
      </div>
      <div className="clientAndNotes">
        <b>
          <Highlighter
            searchWords={[context.filterRegExp]}
            textToHighlight={
              context.sortBy === "familyName"
                ? client.familyName + ", " + client.givenName
                : client.givenName + " " + client.familyName
            }
          />
        </b>
        <div
          style={{
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
        >
          <Highlighter
            searchWords={[context.filterRegExp]}
            textToHighlight={client.email || ""}
          />
        </div>
        <div
          style={{
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
        >
          <Highlighter
            searchWords={[context.filterRegExp]}
            textToHighlight={client.phone || ""}
          />
        </div>
      </div>
      <div className="dateAndActions">
        <div style={{ fontWeight: dateStr ? 500 : undefined }}>
          {dateStr || "Never"}
        </div>
        <Stack
          direction="row"
          spacing={0}
          alignItems="center"
          justifyContent="right"
        >
          <Link href={`/client/edit/${client._id}`}>
            <IconButton size="small">
              <Edit sx={{ fontSize: "100%" }} />
            </IconButton>
          </Link>
        </Stack>
      </div>
    </div>
  );
}

export default function Clients() {
  const { practiceId, PracticeSelect } = usePracticeId();
  const [sortBy, setSortBy] = React.useState("givenName");

  const pathname = usePathname();
  const fabBottom = pathname === "/clients" ? 16 : 72;

  useGongoSub(practiceId && "clientsForPractice", { _id: practiceId });
  useGongoSub(practiceId && "treatmentsForPractice", { _id: practiceId });

  const [filter, setFilter] = React.useState("");
  const _clients = useGongoLive((db) =>
    db.collection("clients").find({ practiceId }),
  );
  const _treatments = useGongoLive((db) =>
    db.collection("treatments").find({ practiceId }),
  );

  const { clients, filterRegExp } = React.useMemo(() => {
    const re = new RegExp(filter, "i");
    const clients = _clients
      .filter((client) => {
        if (!filter) return true;
        if (re.test(client.givenName)) return true;
        if (client.familyName && re.test(client.familyName)) return true;
        if (client.phone && re.test(client.phone)) return true;
        if (client.email && re.test(client.email)) return true;
        if (client.notes && re.test(client.notes)) return true;
        // for (const email of user.emails) if (re.test(email.value)) return true;
        // if (user.username && re.test(user.username)) return true;
        return false;
      })
      .map((client) => {
        _treatments; // to trigger reactivity
        const lastTreatment = db
          .collection("treatments")
          .find({
            clientId: client._id,
          })
          .sort("date", -1)
          .limit(1)
          .toArraySync()[0];
        return { ...client, lastTreatment };
      })
      .sort((a, b) => {
        if (sortBy === "lastTreatment") {
          // @ts-expect-error: it's fine
          return (b.lastTreatment?.date || 0) - (a.lastTreatment?.date || 0);
        } else {
          // @ts-expect-error: it's fine
          return a[sortBy] < b[sortBy] ? -1 : 1;
        }
      });
    return { clients, filterRegExp: re };
  }, [_clients, _treatments, filter, sortBy]);

  return (
    <Container maxWidth="lg" sx={{ my: 2 }}>
      <Box>
        <PracticeSelect sx={{ mb: 2 }} />

        <div className="sortByRadio" style={{ marginBottom: 10 }}>
          <FormControl
            sx={{ flexDirection: "row", alignItems: "center", gap: 2 }}
          >
            <FormLabel id="sortby-label">Sort by</FormLabel>
            <RadioGroup
              aria-labelledby="sortby-label"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              row
            >
              <FormControlLabel
                value="givenName"
                control={<Radio size="small" />}
                label="first"
              />
              <FormControlLabel
                value="familyName"
                control={<Radio size="small" />}
                label="last"
              />
              <FormControlLabel
                value="lastTreatment"
                control={<Radio size="small" />}
                label="treatment"
              />
            </RadioGroup>
          </FormControl>
        </div>

        <TextField
          size="small"
          value={filter}
          placeholder="Filter by name, email, phone"
          onChange={(event) => setFilter(event.target.value)}
        />

        <p>Total clients: {clients.length}</p>
        {/* sub.isMore && <Button onClick={sub.loadMore}>Load More</Button> */}

        <div role="list">
          <Virtuoso
            context={{ filterRegExp, sortBy }}
            data={clients}
            itemContent={clientRow}
            useWindowScroll
          />
        </div>

        <Fab
          sx={{ position: "fixed", bottom: fabBottom, right: 16 }}
          color="primary"
          component={NextLink}
          href="/client/edit/new"
        >
          <Add sx={{ fontSize: "200%" }} />
        </Fab>
      </Box>
    </Container>
  );
}
