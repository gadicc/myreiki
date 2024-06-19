import { z } from "zod";
import dayjs, { type Dayjs } from "dayjs";

export const bodyPoint = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  size: z.number().min(1).max(5),
  level: z.number().min(1).max(5),
});

export const bodyPoints = z.object({
  front: bodyPoint.array(),
  back: bodyPoint.array(),
});

export const treatmentBaseSchema = z.object({
  _id: z.string().optional(),
  clientId: z.string(),
  practitionerId: z.string(),
  practiceId: z.string(),
  date: z.date().or(z.instanceof(dayjs as unknown as typeof Dayjs)),
  duration: z.coerce.number().int().positive(),
  bodyPoints: bodyPoints.optional(),
  notes: z.string().optional(),
});

const treatmentGenericSchema = treatmentBaseSchema.extend({
  type: z.literal("generic"),
});

export const treatmentReikiSchema = treatmentBaseSchema.extend({
  type: z.literal("reiki"),
  reiki: z.object({
    type: z.enum(["regular", "psychological", "self", "distance", "non-human"]),
  }),
});

export const treatmentSchema = z.discriminatedUnion("type", [
  treatmentGenericSchema,
  treatmentReikiSchema,
]);

export type Treatment = z.infer<typeof treatmentSchema> & {
  __ObjectIDs: string[];
};
