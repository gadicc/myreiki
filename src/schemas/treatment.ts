import { z } from "zod";
import dayjs, { type Dayjs } from "dayjs";

export const treatmentBaseSchema = z.object({
  _id: z.string().optional(),
  clientId: z.string(),
  practitionerId: z.string(),
  practiceId: z.string(),
  date: z.date().or(z.instanceof(dayjs as unknown as typeof Dayjs)),
  duration: z.coerce.number().int().positive(),
  notes: z.string().optional(),
});

const treatmentGenericSchema = treatmentBaseSchema.extend({
  type: z.literal("generic"),
});

export const treatmentReikiSchema = treatmentBaseSchema.extend({
  type: z.literal("reiki"),
  reiki: z.object({
    type: z.enum(["regular", "self", "distance", "non-human"]),
  }),
});

export const treatmentSchema = z.discriminatedUnion("type", [
  treatmentGenericSchema,
  treatmentReikiSchema,
]);

export type Treatment = z.infer<typeof treatmentSchema> & {
  __ObjectIDs: string[];
};
