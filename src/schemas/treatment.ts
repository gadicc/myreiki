import { z } from "zod";
import dayjs, { type Dayjs } from "dayjs";

export const treatmentSchema = z.object({
  _id: z.string().optional(),
  clientId: z.string(),
  practitionerId: z.string(),
  practiceId: z.string(),
  date: z.date().or(z.instanceof(dayjs as unknown as typeof Dayjs)),
  duration: z.coerce.number().int().positive(),
  type: z.enum(["regular", "self", "distance", "animal"]),
  notes: z.string().optional(),
});

export type Treatment = z.infer<typeof treatmentSchema> & {
  __ObjectIDs: string[];
};
