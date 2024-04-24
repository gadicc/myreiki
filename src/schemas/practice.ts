import { z } from "zod";

export const practiceSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  name: z.string(),
  // address: string(),
  countryId: z.string().min(2).max(2).optional().or(z.literal("")),
  phone: z
    .string()
    .regex(/^(\+[1-9]\d{1,14})?$/) // Intl +XX or nothing
    .optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  notes: z.string().optional(),
});

export type Practice = z.infer<typeof practiceSchema> & {
  __ObjectIDs: string[];
};
