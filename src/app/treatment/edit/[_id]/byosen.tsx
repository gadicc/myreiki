"use client";
import React from "react";
import {
  Button,
  IconButton,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import Popper, { Arrow } from "@/components/Popper";

import BodyFront from "@/components/body-front.svg";
import BodyBack from "@/components/body-back.svg";
import {
  ArrowBack,
  ArrowDownward,
  ArrowForward,
  ArrowUpward,
} from "@mui/icons-material";

// https://stackoverflow.com/a/49729715/1839099
function precisionRound(number: number, precision: number) {
  const factor = Math.pow(10, precision);
  const n = precision < 0 ? number : 0.01 / factor + number;
  return Math.round(n * factor) / factor;
}

interface BodyPoint {
  x: number;
  y: number;
  size: number;
  level: number;
}

const levels = [
  ,
  { backgroundColor: "#eedd00" }, // darker yellow
  { backgroundColor: "#e0aa00" },
  { backgroundColor: "#ffa500" }, // orange
  { backgroundColor: "#ff6600" },
  { backgroundColor: "#ff0000" }, // red
];

const levelDesc = [
  "On-Netsu (Warmth)",
  "Atsui-On-Netsu (Intense Heat)",
  "Piri-Piri-Kan (Tingling)",
  "Hibiki (Throbbing)",
  "Itami (Pain)",
];

function PointPopper({
  id,
  open,
  handleClose,
  anchorEl,
  pointIdx,
  points,
  setPoints,
}: {
  id: string | undefined;
  open: boolean;
  handleClose: () => void;
  anchorEl: HTMLElement | null;
  pointIdx: number;
  points: BodyPoint[];
  setPoints: React.Dispatch<React.SetStateAction<BodyPoint[]>>;
}) {
  const point = points[pointIdx];
  const [arrowRef, setArrowRef] = React.useState<HTMLSpanElement | null>(null);

  function handleSizeChange(
    event: React.MouseEvent<HTMLElement, MouseEvent>,
    size: number,
  ) {
    event.preventDefault();
    event.stopPropagation();
    if (point) {
      const newPoints = [...points];
      newPoints[pointIdx] = { ...point, size };
      setPoints(newPoints);
    }
  }
  function handleLevelChange(
    event: React.MouseEvent<HTMLElement, MouseEvent>,
    level: number,
  ) {
    event.preventDefault();
    event.stopPropagation();
    if (point) {
      const newPoints = [...points];
      newPoints[pointIdx] = { ...point, level };
      setPoints(newPoints);
    }
  }
  function handleMove(
    event: React.MouseEvent<HTMLElement, MouseEvent>,
    x: number,
    y: number,
  ) {
    event.preventDefault();
    event.stopPropagation();
    if (point) {
      const newPoints = [...points];
      newPoints[pointIdx] = { ...point, x: point.x + x, y: point.y + y };
      setPoints(newPoints);
    }
  }
  function handleDelete(event: React.MouseEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (point) {
      const newPoints = [...points];
      newPoints.splice(pointIdx, 1);
      setPoints(newPoints);
      handleClose();
    }
  }
  function handleCloseEvent(event: React.MouseEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    handleClose();
  }

  return (
    <Popper
      id={id}
      open={open}
      anchorEl={anchorEl}
      arrow={true}
      backgroundColor="#f0f0f0"
      modifiers={[
        {
          name: "arrow",
          enabled: true,
          options: {
            element: arrowRef,
          },
        },
      ]}
    >
      <div style={{ textAlign: "center" }}>
        <Arrow ref={setArrowRef} className="MuiPopper-arrow" />
        <Paper sx={{ p: 1 }}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ marginBottom: 1 }}
          >
            <Typography width={50}>Size: </Typography>
            <ToggleButtonGroup
              value={point?.size}
              exclusive
              onChange={handleSizeChange}
              aria-label="text alignment"
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <ToggleButton
                  key={value}
                  value={value}
                  aria-label={value.toString()}
                  size="small"
                >
                  {value}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <Typography width={50}>Level: </Typography>
            <ToggleButtonGroup
              value={point?.level}
              exclusive
              onChange={handleLevelChange}
              aria-label="text alignment"
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <ToggleButton
                  key={value}
                  value={value}
                  aria-label={value.toString()}
                  size="small"
                >
                  {value}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Stack>
          <Typography variant="caption">
            {point && levelDesc[point.level - 1]}
          </Typography>
          <br />
          <div>
            <IconButton onClick={(e) => handleMove(e, -0.01, 0)}>
              <ArrowBack />
            </IconButton>
            <IconButton onClick={(e) => handleMove(e, 0, -0.01)}>
              <ArrowUpward />
            </IconButton>
            <IconButton onClick={(e) => handleMove(e, 0, 0.01)}>
              <ArrowDownward />
            </IconButton>
            <IconButton onClick={(e) => handleMove(e, 0.01, 0)}>
              <ArrowForward />
            </IconButton>
          </div>
          <div>
            <Button color="warning" onClick={handleDelete}>
              Delete
            </Button>
            <Button color="primary" onClick={handleCloseEvent}>
              Close
            </Button>
          </div>
        </Paper>
      </div>
    </Popper>
  );
}

function Diagram({
  name,
  points,
  setPoints,
  Component,
}: {
  name: string;
  points: BodyPoint[];
  setPoints: React.Dispatch<React.SetStateAction<BodyPoint[]>>;
  Component: typeof BodyFront;
}) {
  const [pointIdx, setPointIdx] = React.useState(-1);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const popoverId = anchorEl ? "point-popover" : undefined;

  function onClick(event: React.MouseEvent<HTMLElement>) {
    const target = event.currentTarget as HTMLDivElement;
    const rect = target.getBoundingClientRect();
    // the +2 is to correct the pointer offset
    // (target click is slightly offset from index finger of pointer)
    const x = event.clientX - rect.left + 2;
    const y = event.clientY - rect.top + 2;
    const xPct = precisionRound(x / rect.width, 4);
    const yPct = precisionRound(y / rect.height, 4);
    setPoints([...points, { x: xPct, y: yPct, size: 2, level: 1 }]);
    console.log({
      x,
      y,
      xPct,
      yPct,
      rectWidth: rect.width,
      rectHeight: rect.height,
    });
  }

  const onClickPoint = React.useCallback(
    (event: React.MouseEvent<HTMLElement>, p: BodyPoint) => {
      event.preventDefault();
      event.stopPropagation();
      const index = points.indexOf(p);
      /* remove:
    if (index !== -1) {
      const newPoints = [...points];
      newPoints.splice(index, 1);
      setPoints(newPoints);
    }
    */
      // console.log(index, p, event);
      setAnchorEl(anchorEl ? null : event.currentTarget);
      setPointIdx(index);
    },
    [anchorEl, points],
  );

  const sizeStyle = ({ x, y, size }: BodyPoint) => {
    // const pixelSize = 5 + size * 7;

    return {
      "--size": size,
      lineHeight: `calc(2cqb * var(--size))`,
      width: `1lh`,
      height: "1lh",
      left: `calc(${x * 100}% - 0.5lh)`,
      top: `calc(${y * 100}% - 0.5lh)`,
    };
  };

  return (
    <div
      style={{
        position: "relative",
        cursor: "pointer",
      }}
      onClick={onClick}
    >
      <Component width="100%" height={undefined} />
      <div
        style={{
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          containerType: "size",
          position: "absolute",
        }}
      >
        {points.map((p, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              borderRadius: "50%",
              textAlign: "center",
              userSelect: "none",
              fontSize: 6,
              // opacity: 0.8,
              // mixBlendMode: "hard-light",
              ...sizeStyle(p),
              ...levels[p.level],
            }}
            onClick={(e) => onClickPoint(e, p)}
          >
            {name[0].toUpperCase() + (i + 1)}
          </div>
        ))}
      </div>
      <PointPopper
        id={popoverId}
        open={Boolean(anchorEl)}
        handleClose={() => setAnchorEl(null)}
        anchorEl={anchorEl}
        pointIdx={pointIdx}
        points={points}
        setPoints={setPoints}
      />
    </div>
  );
}

/*
const samplePoints: BodyPoint[] = [
  { x: 0.1, y: 0.1, size: 1, level: 1 },
  { x: 0.3, y: 0.3, size: 2, level: 2 },
  { x: 0.5, y: 0.5, size: 3, level: 3 },
  { x: 0.7, y: 0.7, size: 4, level: 4 },
  { x: 0.9, y: 0.9, size: 5, level: 5 },
];
*/

export default function Byosen() {
  const [backPoints, setBackPoints] = React.useState<BodyPoint[]>(
    [] /* samplePoints */,
  );
  const [frontPoints, setFrontPoints] = React.useState<BodyPoint[]>([]);

  return (
    <div>
      <p>
        <b>Byosen</b>:<i>Work in Progress - doesn&apos;t save yet</i>
      </p>
      <Stack direction="row" spacing={1}>
        <Diagram
          name="front"
          points={frontPoints}
          setPoints={setFrontPoints}
          Component={BodyFront}
        />
        <Diagram
          name="back"
          points={backPoints}
          setPoints={setBackPoints}
          Component={BodyBack}
        />
      </Stack>
    </div>
  );
}
