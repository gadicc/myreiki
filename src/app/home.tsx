import {
  Box,
  Button,
  Container,
  LinearProgress,
  LinearProgressProps,
  Typography,
} from "@mui/material";
import React from "react";
import { useClientTreatments } from "@/app/treatments/page";
import usePracticeId from "@/lib/usePracticeId";
import NextLink from "next/link";

const SHIHANKAKU_REQUIRED_CLIENTS = 40;
const SHIHANKAKU_REQUIRED_HOURS = 120;

function LinearProgressWithLabel(
  props: LinearProgressProps & { value: number } & {
    label: string;
    labelMinWidth?: number;
    preLabel?: string;
    preLabelMinWidth?: number;
  },
) {
  const { label, labelMinWidth, preLabel, preLabelMinWidth, ...rest } = props;
  return (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      {preLabel && (
        <Box sx={{ minWidth: preLabelMinWidth || 35 }}>
          <Typography variant="body2" color="text.secondary">
            {preLabel}
          </Typography>
        </Box>
      )}
      <Box sx={{ width: "100%", mr: 1 }}>
        <LinearProgress variant="determinate" {...rest} />
      </Box>
      <Box sx={{ minWidth: labelMinWidth || 35 }}>
        <Typography variant="body2" color="text.secondary">
          {label || `${Math.round(props.value)}%`}
        </Typography>
      </Box>
    </Box>
  );
}

export default function HomePage() {
  const { practiceId, PracticeSelect } = usePracticeId();
  const treatments = useClientTreatments(practiceId);

  const { tallies } = React.useMemo(() => {
    const tallies = {
      all: { treatments: 0, uniqueClients: 0, totalMinutes: 0, totalHours: 0 },
      shihankaku: {
        treatments: 0,
        uniqueClients: 0,
        totalMinutes: 0,
        totalHours: 0,
      },
    };
    const clients = { all: new Set(), shihankaku: new Set() };

    for (const treatment of treatments) {
      if (treatment.type !== "reiki") continue;

      tallies.all.treatments++;
      tallies.all.totalMinutes += treatment.duration;
      clients.all.add(treatment.clientId);

      if (treatment.reiki.type === "regular") {
        tallies.shihankaku.treatments++;
        tallies.shihankaku.totalMinutes += treatment.duration;
        clients.shihankaku.add(treatment.clientId);
      }
    }

    tallies.all.uniqueClients = clients.all.size;
    tallies.shihankaku.uniqueClients = clients.shihankaku.size;
    tallies.all.totalHours = Math.round(tallies.all.totalMinutes / 60);
    tallies.shihankaku.totalHours = Math.round(
      tallies.shihankaku.totalMinutes / 60,
    );

    return { tallies };
  }, [treatments]);

  console.log(tallies);

  return (
    <Container sx={{ my: 2 }}>
      <PracticeSelect />

      <Box sx={{ textAlign: "center", marginTop: 1 }}>
        <Typography variant="h6">Reiki</Typography>

        <p>
          <b>Total Progress</b>
          <table
            border={1}
            cellSpacing={0}
            style={{ minWidth: 400, margin: "auto", marginTop: 8 }}
          >
            <tbody>
              <tr>
                <td width="33%">
                  <div style={{ fontSize: "160%" }}>
                    {tallies.all.treatments}
                  </div>
                  <div style={{ fontSize: "80%" }}>treatments</div>
                </td>
                <td width="33%">
                  <div style={{ fontSize: "160%" }}>
                    {tallies.all.uniqueClients}
                  </div>
                  <div style={{ fontSize: "80%" }}>clients</div>
                </td>
                <td width="33%">
                  <div style={{ fontSize: "160%" }}>
                    {tallies.all.totalHours}
                  </div>
                  <div style={{ fontSize: "80%" }}>hours</div>
                </td>
              </tr>
            </tbody>
          </table>
        </p>

        <b>Shihankaku Progress</b>

        <LinearProgressWithLabel
          value={
            (tallies.shihankaku.uniqueClients / SHIHANKAKU_REQUIRED_CLIENTS) *
            100
          }
          preLabel="Clients"
          preLabelMinWidth={50}
          label={`${tallies.shihankaku.uniqueClients} / ${SHIHANKAKU_REQUIRED_CLIENTS}`}
          labelMinWidth={50}
        />
        <LinearProgressWithLabel
          value={
            (tallies.shihankaku.totalHours / SHIHANKAKU_REQUIRED_HOURS) * 100
          }
          preLabel="Hours"
          preLabelMinWidth={50}
          label={`${tallies.shihankaku.totalHours} / ${SHIHANKAKU_REQUIRED_HOURS}`}
          labelMinWidth={50}
        />

        <br />
        <Button
          variant="contained"
          component={NextLink}
          href="/treatments/edit/new"
        >
          New Treatment
        </Button>
        <br />
      </Box>
    </Container>
  );
}
