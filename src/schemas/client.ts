import { z } from "zod";

export const clientSchema = z.object({
  _id: z.string().optional(),
  practiceId: z.string(),
  givenName: z.string(),
  familyName: z.string(),
  phone: z
    .string()
    .regex(/^(\+[1-9]\d{1,14})?$/) // Intl +XX or nothing
    .optional(),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
});

export type Client = z.infer<typeof clientSchema> & {
  __ObjectIDs: string[];
};
