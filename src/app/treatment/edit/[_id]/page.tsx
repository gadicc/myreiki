"use client";
import {
  Alert,
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
import dayjs, { type Dayjs } from "dayjs";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { useWatch } from "react-hook-form";
import { usePracticeData } from "@/client-data/Provider";
import { useCanonicalRecordId } from "@/client-data/useCanonicalRecordId";
import { useRecordDraft } from "@/client-data/useRecordDraft";
import TreatmentDateField from "@/components/TreatmentDateField";
import ClientOnly from "@/lib/ClientOnly";
import { useForm } from "@/lib/forms";
import useClientId from "@/lib/useClientId";
import usePracticeId from "@/lib/usePracticeId";
import { uuidV7 } from "@/lib/uuid";
import { Treatment, treatmentSchema } from "@/schemas";
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
  const data = usePracticeData();
  const userId = data.profile?._id;
  const [saveError, setSaveError] = React.useState("");
  const params = useParams();
  const searchParams = useSearchParams();
  const { practiceId, setPracticeId, PracticeSelect } = usePracticeId();
  const _id = params?._id;
  const cloneId = searchParams?.get("cloneId");

  const canonicalRecordId = useCanonicalRecordId("treatments", cloneId || _id);
  const existing = data.treatments.find((row) => row._id === canonicalRecordId);
  const { draft, acceptSaved } = useRecordDraft(existing);
  React.useEffect(() => {
    if (existing) setPracticeId(existing.practiceId);
  }, [existing?.practiceId, setPracticeId]);
  const { clientId, ClientSelect } = useClientId({
    initialClientId: existing?.clientId,
  });

  async function onSubmit(
    treatment: Treatment,
    _event?: React.BaseSyntheticEvent,
  ) {
    if (!practiceId) return;
    treatment.practiceId = existing?.practiceId || practiceId;

    if (!userId) return;
    treatment.practitionerId = userId;

    if (!clientId) return;
    treatment.clientId = clientId;

    if (treatment.date instanceof dayjs)
      treatment.date = (treatment.date as unknown as Dayjs).toDate();

    if (treatment.bodyPoints === undefined) delete treatment.bodyPoints;

    // console.log(treatment);
    // return;

    try {
      const saved = await data.save(
        "treatments",
        { ...treatment, _id: treatment._id || uuidV7() },
        _id === "new" || cloneId ? 0 : draft?.version,
      );
      acceptSaved(saved);
      setSaveError("");
      if (_id === "new" || cloneId) router.push(`/treatment/edit/${saved._id}`);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Could not save on this device",
      );
      return;
    }

    const event = _event as
      | React.SyntheticEvent<HTMLFormElement, SubmitEvent>
      | undefined;
    const submitter = event?.nativeEvent.submitter;
    const dest = submitter?.getAttribute("data-dest");
    if (dest === "back") router.back();
  }

  const newId = React.useRef(uuidV7()).current;
  const formValues = React.useMemo(() => {
    if (!draft) return undefined;
    const id = cloneId ? newId : draft._id;
    return {
      ...draft,
      _id: id,
      date: cloneId ? dayjs() : dayjs(draft.date),
      ...(cloneId && draft.bodyPoints
        ? {
            bodyPoints: Object.fromEntries(
              Object.entries(draft.bodyPoints).map(([side, points]) => [
                side,
                points.map((p) => ({ ...p, _id: uuidV7(), treatmentId: id })),
              ]),
            ) as Treatment["bodyPoints"],
          }
        : {}),
    };
  }, [draft, cloneId, newId]);

  const useFormProps = useForm<Treatment>({
    values: formValues,
    schema: treatmentSchema,
    defaultValues: {
      // We assign _id now so it can be used in subforms, e.g. bodyPoints.
      _id: newId,
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

  // Used for subforms, e.g. bodyPoints.  Differs from route _id which
  // could be "new".
  const treatmentId = getValues("_id");
  if (!treatmentId) throw new Error("treatmentId not set");

  if (!existing && _id !== "new") return "Loading or not found...";
  if (!userId) return "Not logged in";

  // console.log(formState);

  return (
    <Container sx={{ my: 2 }}>
      {saveError && <Alert severity="error">{saveError}</Alert>}
      <ClientOnly>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={2} direction="column">
            {!existing && <PracticeSelect />}
            <ClientSelect practiceId={practiceId} required />
            <TreatmentDateField control={control} />
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
                  render={({ field: { onChange, name, value } }) => (
                    <BodyPoints
                      // {...field}
                      name={name}
                      value={value}
                      onChange={onChange}
                      treatmentId={treatmentId}
                    />
                  )}
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
