"use client";
import React from "react";
import {
  db,
  useGongoOne,
  useGongoSub,
  useGongoUserId,
  OptionalId,
} from "gongo-client-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import dayjs, { type Dayjs } from "dayjs";
import {
  Button,
  Container,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
} from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers";

import { treatmentSchema, Treatment } from "@/schemas";
import ClientOnly from "@/lib/ClientOnly";
import { useForm } from "@/lib/forms";
import usePracticeId from "@/lib/usePracticeId";
import useClientId from "@/lib/useClientId";
import { useWatch } from "react-hook-form";
import BodyPoints from "./bodyPoints";

export type UseFormTreatmentProps = ReturnType<typeof useForm<Treatment>>;

const sxDurationButton = {
  borderColor: "light-dark(rgb(205, 205, 205), rgb(133, 133, 133))",
  color: "rgba(0, 0, 0, 0.87)",
  display: "block",
  lineHeight: 1.5,
};

export default function TreatmentEdit() {
  const router = useRouter();
  const userId = useGongoUserId();
  const params = useParams();
  const searchParams = useSearchParams();
  const { practiceId, PracticeSelect } = usePracticeId();
  const _id = params?._id;
  const cloneId = searchParams?.get("cloneId");

  useGongoSub(_id === "new" ? false : "treatment", { _id });
  const existing = useGongoOne((db) =>
    db.collection("treatments").find({ _id: cloneId || _id }),
  );
  const { clientId, ClientSelect } = useClientId({
    initialClientId: existing?.clientId,
  });

  function onSubmit(
    treatment: OptionalId<Treatment>,
    _event?: React.BaseSyntheticEvent,
  ) {
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

    if (treatment.bodyPoints === undefined) delete treatment.bodyPoints;

    // console.log(treatment);
    // return;

    if (_id === "new" || cloneId) {
      if (cloneId) delete treatment._id;
      const insertedDoc = db.collection("treatments").insert(treatment);
      router.push(`/treatment/edit/${insertedDoc._id}`);
    } else {
      db.collection("treatments").update({ _id }, { $set: treatment });
    }

    const event = _event as
      | React.SyntheticEvent<HTMLFormElement, SubmitEvent>
      | undefined;
    const submitter = event?.nativeEvent.submitter;
    const dest = submitter?.getAttribute("data-dest");
    if (dest === "back") router.back();
  }

  const useFormProps = useForm<Treatment>({
    values: existing ? { ...existing, date: dayjs(existing.date) } : undefined,
    schema: treatmentSchema,
    defaultValues: {
      clientId: "",
      practitionerId: userId || "",
      practiceId: practiceId || "",
      date: dayjs(new Date()),
      duration: 60,
      type: "reiki" as const,
      reiki: { type: "regular" },
      notes: "",
    },
  });
  const {
    handleSubmit,
    setValue,
    getValues,
    control,
    Controller,
    fr,
    formState: { isDirty },
  } = useFormProps;

  useWatch({ control, name: "type" });
  const type = getValues("type");

  // If we are cloning a treatment, set the date to now and dirty the form.
  React.useEffect(() => {
    if (existing && cloneId) setValue("date", dayjs(), { shouldDirty: true });
  }, [existing, cloneId, setValue]);

  if (!existing && _id !== "new") return "Loading or not found...";
  if (!userId) return "Not logged in";

  // console.log(formState);

  return (
    <Container sx={{ my: 2 }}>
      <ClientOnly>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={2} direction="column">
            <PracticeSelect />
            <ClientSelect practiceId={practiceId} required />
            <Controller
              rules={{ required: true }}
              control={control}
              name="date"
              render={({ field }) => (
                <DateTimePicker label="Date *" {...field} />
              )}
            />
            <Stack direction="row" spacing={2} useFlexGap>
              <TextField
                {...fr("duration")}
                label="Duration (m)"
                type="number"
              />
              {[30, 60, 90].map((duration) => (
                <Button
                  key={duration}
                  variant="outlined"
                  sx={sxDurationButton}
                  onClick={() => {
                    setValue("duration", duration, {
                      shouldDirty: duration !== getValues("duration"),
                    });
                    setValue("date", dayjs().subtract(duration + 2, "minute"), {
                      shouldDirty: true,
                    });
                  }}
                >
                  <div>{duration}</div>
                  <div style={{ fontSize: "80%", color: "#999" }}>
                    T-{duration + 2}
                  </div>
                </Button>
              ))}
            </Stack>
            <FormControl required>
              <FormLabel id="type-buttons-group">Treatment Type</FormLabel>
              <Controller
                rules={{ required: true }}
                control={control}
                name="type"
                render={({ field, fieldState }) => (
                  <RadioGroup
                    aria-labelledby="type-buttons-group"
                    row
                    {...field}
                  >
                    <FormControlLabel
                      value="generic"
                      control={<Radio />}
                      label="Generic"
                    />
                    <FormControlLabel
                      value="reiki"
                      control={<Radio />}
                      label="Reiki"
                    />
                    <FormHelperText>{fieldState.error?.message}</FormHelperText>
                  </RadioGroup>
                )}
              />
            </FormControl>

            {type === "reiki" && (
              <>
                <FormControl required>
                  <FormLabel id="type-buttons-group">Reiki Type</FormLabel>
                  <Controller
                    rules={{ required: true }}
                    control={control}
                    name="reiki.type"
                    render={({ field, fieldState }) => (
                      <RadioGroup
                        aria-labelledby="type-buttons-group"
                        row
                        {...field}
                      >
                        <FormControlLabel
                          value="regular"
                          control={<Radio />}
                          label="Regular"
                        />
                        <FormControlLabel
                          value="psychological"
                          control={<Radio />}
                          label="Psychological"
                        />
                        <FormControlLabel
                          value="distance"
                          control={<Radio />}
                          label="Distance"
                        />
                        <FormControlLabel
                          value="self"
                          control={<Radio />}
                          label="Self"
                        />
                        <FormControlLabel
                          value="non-human"
                          control={<Radio />}
                          label="Non-Human"
                        />
                        <FormHelperText>
                          {fieldState.error?.message}
                        </FormHelperText>
                      </RadioGroup>
                    )}
                  />
                </FormControl>
                <Controller
                  name="bodyPoints"
                  control={control}
                  render={({ field }) => <BodyPoints {...field} />}
                />
              </>
            )}
            {/*
            <ToggleButtonGroup {...fr("type")} exclusive>
              <ToggleButton value="regular">Regular</ToggleButton>
              <ToggleButton value="distance">Distance</ToggleButton>
              <ToggleButton value="self">Self</ToggleButton>
              <ToggleButton value="non-human">Non-Human</ToggleButton>
            </ToggleButtonGroup>
            */}

            <TextField {...fr("notes")} label="Notes" fullWidth multiline />

            <Stack spacing={1} direction="row">
              <Button
                variant="outlined"
                type="submit"
                fullWidth
                disabled={!isDirty}
              >
                Save
              </Button>
              <Button
                variant="contained"
                type="submit"
                fullWidth
                data-dest="back"
                disabled={!isDirty}
              >
                Save & Back
              </Button>
            </Stack>
          </Stack>
        </form>
      </ClientOnly>
    </Container>
  );
}
