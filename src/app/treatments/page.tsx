"use client";

import React from "react";
// import { t, Trans } from "@lingui/macro";
import { Virtuoso } from "react-virtuoso";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { sha256 } from "js-sha256";

import dayjs from "dayjs";
import dayJsIsToday from "dayjs/plugin/isToday";
import dayJsAdvancedFormat from "dayjs/plugin/advancedFormat";

import {
  Avatar,
  Box,
  Checkbox,
  Container,
  Fab,
  FormControlLabel,
  FormGroup,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Add, Edit, EventRepeat } from "@mui/icons-material";

import Link from "@/lib/link";
import { Treatment, Client } from "@/schemas";
import usePracticeId from "../../lib/usePracticeId";
import useClientTreatments from "./useClientTreatments";

type TreatmentWithClient = Treatment & { client?: Client | null };

dayjs.extend(dayJsIsToday);
dayjs.extend(dayJsAdvancedFormat);

// From https://mui.com/material-ui/react-avatar/
function stringToColor(string: string) {
  let hash = 0;
  let i;

  /* eslint-disable no-bitwise */
  for (i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = "#";

  for (i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  /* eslint-enable no-bitwise */

  return color;
}

function clientAvatarProps(
  client: Client | { givenName: string; familyName: string },
) {
  const givenName = client.givenName || " ";
  const familyName = client.familyName || " ";
  const initials = givenName[0] + familyName[0];
  const color = stringToColor(initials);
  return {
    sx: { backgroundColor: color },
    children: initials,
  };
}

function treatmentRow(_index: number, treatment: TreatmentWithClient) {
  const client = treatment.client || { givenName: "Unknown", familyName: "" };
  const now = dayjs();
  const date = dayjs(treatment.date);
  let dateStr;
  if (date.isToday()) dateStr = date.format("HH:mm");
  else if (now.diff(date, "days") < 7) dateStr = date.format("ddd Do");
  else if (date.year() === now.year()) dateStr = date.format("D MMM");
  else dateStr = (treatment.date as Date).toLocaleDateString();

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
  const avatarProps: Parameters<typeof Avatar>[0]["sx"] =
    clientAvatarProps(client);
  // avatarProps.sx = { ...(avatarProps.sx as object), top: -5 };
  const avatarSrc =
    ("email" in client &&
      client.email &&
      `https://www.gravatar.com/avatar/${sha256(client.email.trim().toLowerCase())}?d=wavatar`) ||
    undefined;

  return (
    <div className="treatmentRow" role="listitem">
      <style jsx>{`
        .treatmentRow {
          height: 63px;
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
        <Avatar {...avatarProps} src={avatarSrc} />
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
      </div>
      <div className="clientAndNotes">
        <b>
          {client.givenName} {client.familyName}
        </b>
        <br />
        <div
          style={{
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
        >
          {treatment.notes}
        </div>
      </div>
      <div className="dateAndActions">
        <div style={{ fontWeight: 500 }}>{dateStr}</div>
        <Stack
          direction="row"
          spacing={0}
          alignItems="center"
          justifyContent="right"
        >
          <Link href={`/treatment/edit/${treatment._id}`}>
            <IconButton size="small">
              <Edit sx={{ fontSize: "100%" }} />
            </IconButton>
          </Link>{" "}
          {"_id" in client && (
            <Link href={`/treatment/edit/new?cloneId=${treatment._id}`}>
              <IconButton size="small">
                <EventRepeat sx={{ fontSize: "100%" }} />
              </IconButton>
            </Link>
          )}
        </Stack>
      </div>
    </div>
  );
}

export default function Clients() {
  const { practiceId, PracticeSelect } = usePracticeId();
  const _combined = useClientTreatments(practiceId, { sort: ["date", "desc"] });

  const [shihanKakuFilter, setShihanKakuFilter] = React.useState(false);
  const combined = React.useMemo(() => {
    return shihanKakuFilter
      ? _combined.filter(
          (t) => t.type === "reiki" && t.reiki.type === "regular",
        )
      : _combined;
  }, [_combined, shihanKakuFilter]);

  const pathname = usePathname();
  const fabBottom = pathname === "/treatments" ? 16 : 72;

  const [filter, setFilter] = React.useState("");
  const { treatments, hours } = React.useMemo(() => {
    const re = new RegExp(filter, "i");
    const treatments = combined.filter((treatment) => {
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
    return {
      treatments,
      hours: Math.round(
        treatments.reduce((acc, t) => acc + t.duration, 0) / 60,
      ),
    };
  }, [combined, filter]);

  return (
    <Container maxWidth="lg" sx={{ my: 2 }}>
      <Box>
        <PracticeSelect sx={{ mb: 2 }} />

        <Typography variant="h6">Treatments</Typography>
        <Stack direction="row" spacing={2}>
          <TextField
            size="small"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={shihanKakuFilter}
                  onChange={(e) => setShihanKakuFilter(e.target.checked)}
                />
              }
              label="Shihankaku"
            />
          </FormGroup>
        </Stack>

        <p>
          Total treatments: {treatments.length} ({hours} hours)
        </p>
        {/* sub.isMore && <Button onClick={sub.loadMore}>Load More</Button> */}

        <div role="list">
          <Virtuoso
            data={treatments}
            itemContent={treatmentRow}
            useWindowScroll
          />
        </div>

        <Fab
          sx={{ position: "fixed", bottom: fabBottom, right: 16 }}
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
