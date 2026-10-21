"use client";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";

import { Add, Edit } from "@mui/icons-material";
import {
  Box,
  Container,
  Fab,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  Radio,
  RadioGroup,
  Stack,
  TextField,
} from "@mui/material";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import Highlighter from "react-highlight-words";
import { Virtuoso } from "react-virtuoso";
import { usePracticeData } from "@/client-data/Provider";
import { formatTreatmentDate } from "@/lib/i18n/dates";
import Link from "@/lib/link";
import { Client, Treatment } from "@/schemas";
import usePracticeId from "../../lib/usePracticeId";
import { ClientAvatar } from "./clientUtils";

function ClientRow({
  client,
  context,
}: {
  client: Client & { lastTreatment?: Treatment };
  context: { filterRegExp: RegExp; sortBy: string };
}) {
  const { i18n } = useLingui();
  const dateStr = client.lastTreatment
    ? formatTreatmentDate(client.lastTreatment.date, i18n.locale)
    : "";

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
          {dateStr || i18n._(msg`Never`)}
        </div>
        <Stack
          direction="row"
          spacing={0}
          sx={{ alignItems: "center", justifyContent: "right" }}
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
  const { i18n } = useLingui();

  const { practiceId, PracticeSelect } = usePracticeId();
  const [sortBy, setSortBy] = React.useState("givenName");

  const pathname = usePathname();
  const fabBottom = pathname === "/clients" ? 16 : 72;

  const [filter, setFilter] = React.useState("");
  const data = usePracticeData();
  const _clients = data.clients.filter((c) => c.practiceId === practiceId);
  const _treatments = data.treatments.filter(
    (t) => t.practiceId === practiceId,
  );

  const { clients, filterRegExp } = React.useMemo(() => {
    const re = new RegExp(filter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
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
        const lastTreatment = _treatments
          .filter((t) => t.clientId === client._id)
          .sort(
            (a, b) =>
              new Date(b.date as Date).getTime() -
              new Date(a.date as Date).getTime(),
          )[0];
        return { ...client, lastTreatment };
      })
      .sort((a, b) => {
        if (sortBy === "lastTreatment") {
          return (
            (b.lastTreatment
              ? new Date(b.lastTreatment.date as Date).getTime()
              : 0) -
            (a.lastTreatment
              ? new Date(a.lastTreatment.date as Date).getTime()
              : 0)
          );
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
            <FormLabel id="sortby-label">
              <Trans>Sort by</Trans>
            </FormLabel>
            <RadioGroup
              aria-labelledby="sortby-label"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              row
            >
              <FormControlLabel
                value="givenName"
                control={<Radio size="small" />}
                label={i18n._(msg`first`)}
              />
              <FormControlLabel
                value="familyName"
                control={<Radio size="small" />}
                label={i18n._(msg`last`)}
              />
              <FormControlLabel
                value="lastTreatment"
                control={<Radio size="small" />}
                label={i18n._(msg`treatment`)}
              />
            </RadioGroup>
          </FormControl>
        </div>

        <TextField
          size="small"
          value={filter}
          placeholder={i18n._(msg`Filter by name, email, phone`)}
          onChange={(event) => setFilter(event.target.value)}
        />

        <p>
          <Trans>Total clients: {clients.length}</Trans>
        </p>
        {/* sub.isMore && <Button onClick={sub.loadMore}>Load More</Button> */}

        <div role="list">
          <Virtuoso
            context={{ filterRegExp, sortBy }}
            data={clients}
            itemContent={(_index, client, context) => (
              <ClientRow client={client} context={context} />
            )}
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
