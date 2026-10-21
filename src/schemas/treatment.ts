import dayjs, { type Dayjs } from "dayjs";
import * as v from "valibot";

export const bodyPoint = v.object({
  _id: v.string(),
  treatmentId: v.string(),
  x: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  y: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  size: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(5)),
  level: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(5)),
});

export const bodyPoints = v.object({
  front: v.array(bodyPoint),
  back: v.array(bodyPoint),
});

export const treatmentBaseSchema = v.object({
  _id: v.optional(v.string()),
  clientId: v.string(),
  practitionerId: v.string(),
  practiceId: v.string(),
  date: v.union([
    v.date(),
    v.custom<Dayjs>(
      (value) => dayjs.isDayjs(value) && value.isValid(),
      "Enter a valid date",
    ),
  ]),
  duration: v.pipe(
    v.union([v.number(), v.string()]),
    v.transform(Number),
    v.number(),
    v.integer(),
    v.minValue(1),
  ),
  bodyPoints: v.optional(bodyPoints),
  notes: v.optional(v.string()),
});

const treatmentGenericSchema = v.object({
  ...treatmentBaseSchema.entries,
  type: v.literal("generic"),
});

export const treatmentReikiSchema = v.object({
  ...treatmentBaseSchema.entries,
  type: v.literal("reiki"),
  reiki: v.object({
    type: v.picklist([
      "regular",
      "psychological",
      "self",
      "distance",
      "non-human",
    ]),
  }),
});

export const treatmentSchema = v.variant("type", [
  treatmentGenericSchema,
  treatmentReikiSchema,
]);

export type Treatment = v.InferOutput<typeof treatmentSchema>;
