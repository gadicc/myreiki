"use client";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";

import { Add, Edit, EventRepeat } from "@mui/icons-material";
import {
  Box,
  Checkbox,
  Container,
  Fab,
  FormControlLabel,
  FormGroup,
  IconButton,
  Stack,
  TextField,
} from "@mui/material";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import Highlighter from "react-highlight-words";
import { Virtuoso } from "react-virtuoso";
import { formatTreatmentDate } from "@/lib/i18n/dates";
import Link from "@/lib/link";
import { Client, Treatment } from "@/schemas";
import usePracticeId from "../../lib/usePracticeId";
import { ClientAvatar } from "../clients/clientUtils";
import useClientTreatments from "./useClientTreatments";

type TreatmentWithClient = Treatment & { client?: Client | null };

function TreatmentRow({
  treatment,
  context,
}: {
  treatment: TreatmentWithClient;
  context: { filterRegExp: RegExp };
}) {
  const { i18n } = useLingui();
  const client = treatment.client || {
    givenName: i18n._(msg`Unknown`),
    familyName: "",
  };
  const dateStr = formatTreatmentDate(treatment.date, i18n.locale);

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
        <ClientAvatar client={client} />
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
            <Trans>{treatment.duration}m</Trans>
          </span>
        </div>
      </div>
      <div className="clientAndNotes">
        <b>
          <Highlighter
            searchWords={[context.filterRegExp]}
            textToHighlight={client.givenName + " " + client.familyName}
          />
        </b>
        <br />
        <div
          style={{
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
        >
          <Highlighter
            searchWords={[context.filterRegExp]}
            textToHighlight={treatment.notes || ""}
          />
        </div>
      </div>
      <div className="dateAndActions">
        <div style={{ fontWeight: 500 }}>{dateStr}</div>
        <Stack
          direction="row"
          spacing={0}
          sx={{ alignItems: "center", justifyContent: "right" }}
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
  const { i18n } = useLingui();

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
  const { treatments, hours, filterRegExp } = React.useMemo(() => {
    const re = new RegExp(filter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const treatments = combined.filter((treatment) => {
      if (!filter) return true;
      const client = treatment.client;
      if (client) {
        if (re.test(client.givenName)) return true;
        if (client.familyName && re.test(client.familyName)) return true;
        if (client.phone && re.test(client.phone)) return true;
        if (client.email && re.test(client.email)) return true;
        if (treatment.notes && re.test(treatment.notes)) return true;
      }
      return false;
    });
    return {
      treatments,
      hours: Math.round(
        treatments.reduce((acc, t) => acc + t.duration, 0) / 60,
      ),
      filterRegExp: re,
    };
  }, [combined, filter]);

  return (
    <Container maxWidth="lg" sx={{ my: 2 }}>
      <Box>
        <PracticeSelect sx={{ mb: 2 }} />

        <Stack direction="row" spacing={2}>
          <TextField
            size="small"
            value={filter}
            placeholder={i18n._(msg`Filter by contact, notes`)}
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
              label={i18n._(msg`Shihankaku`)}
            />
          </FormGroup>
        </Stack>

        <p>
          <Trans>
            Total treatments: {treatments.length} ({hours} hours)
          </Trans>
        </p>
        {/* sub.isMore && <Button onClick={sub.loadMore}>Load More</Button> */}

        <div role="list">
          <Virtuoso
            context={{ filterRegExp }}
            data={treatments}
            itemContent={(_index, treatment, context) => (
              <TreatmentRow treatment={treatment} context={context} />
            )}
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
