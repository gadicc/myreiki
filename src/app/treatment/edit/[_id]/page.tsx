"use client";
import React from "react";
import {
  db,
  useGongoOne,
  useGongoSub,
  useGongoUserId,
  OptionalId,
} from "gongo-client-react";
import { useParams, useRouter } from "next/navigation";
import dayjs, { type Dayjs } from "dayjs";
import { Button, Container, Stack, TextField } from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers";

import { treatmentSchema, Treatment } from "@/schemas";
import ClientOnly from "@/lib/ClientOnly";
import { useForm } from "@/lib/forms";
import usePracticeId from "@/lib/usePracticeId";
import useClientId from "@/lib/useClientId";

const sxDurationButton = {
  borderColor: "light-dark(rgb(205, 205, 205), rgb(133, 133, 133))",
  color: "rgba(0, 0, 0, 0.87)",
};

export default function TreatmentEdit() {
  const router = useRouter();
  const userId = useGongoUserId();
  const params = useParams();
  const { practiceId, PracticeSelect } = usePracticeId();
  const { clientId, ClientSelect } = useClientId();
  const _id = params?._id;

  useGongoSub(_id === "new" ? false : "treatment", { _id });
  const existing = useGongoOne((db) =>
    db.collection("treatments").find({ _id }),
  );

  function onSubmit(treatment: OptionalId<Treatment>) {
    if (!practiceId) return;
    treatment.practiceId = practiceId;

    if (!userId) return;
    treatment.practitionerId = userId;

    if (!clientId) return;
    treatment.clientId = clientId;

    if (!treatment.__ObjectIDs) treatment.__ObjectIDs = [];
    for (const key of ["clientId", "practitionerId", "practiceId"]) {
      if (!treatment.__ObjectIDs.includes(key)) treatment.__ObjectIDs.push(key);
    }

    if (treatment.date instanceof dayjs)
      treatment.date = (treatment.date as unknown as Dayjs).toDate();

    if (_id === "new") {
      const insertedDoc = db.collection("treatments").insert(treatment);
      router.push(`/treatment/edit/${insertedDoc._id}`);
    } else {
      db.collection("treatments").update({ _id }, { $set: treatment });
    }
  }

  const { handleSubmit, setValue, fr } = useForm<Treatment>({
    values: existing ? { ...existing, date: dayjs(existing.date) } : undefined,
    schema: treatmentSchema,
    defaultValues: {
      clientId: "",
      practitionerId: userId || "",
      practiceId: practiceId || "",
      date: dayjs(new Date()),
      duration: 60,
      type: "regular",
      notes: "",
    },
  });

  if (!existing && _id !== "new") return "Loading or not found...";
  if (!userId) return "Not logged in";

  // console.log(formState);

  return (
    <Container sx={{ my: 2 }}>
      <ClientOnly>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={2} direction="column">
            <PracticeSelect />
            <ClientSelect practiceId={practiceId} />
            {/* @ts-expect-error: TODO, overload in forms.tsx */}
            <DateTimePicker
              {...fr("date", { onChangeTransform: true })}
              label="Date"
            />
            <Stack direction="row" spacing={2} useFlexGap>
              <TextField
                {...fr("duration")}
                label="Duration (m)"
                type="number"
              />
              <Button
                variant="outlined"
                sx={sxDurationButton}
                onClick={() => setValue("duration", 30)}
              >
                30
              </Button>
              <Button
                variant="outlined"
                sx={sxDurationButton}
                onClick={() => setValue("duration", 60)}
              >
                60
              </Button>
              <Button
                variant="outlined"
                sx={sxDurationButton}
                onClick={() => setValue("duration", 90)}
              >
                90
              </Button>
            </Stack>
            <TextField {...fr("notes")} label="Notes" fullWidth multiline />

            <Button variant="contained" type="submit">
              Submit
            </Button>
          </Stack>
        </form>
      </ClientOnly>
    </Container>
  );
}
