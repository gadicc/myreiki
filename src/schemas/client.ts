import * as v from "valibot";
import { emailSchema, phoneSchema } from "./contact";

export const clientSchema = v.object({
  _id: v.optional(v.string()),
  practiceId: v.string(),
  givenName: v.string(),
  familyName: v.optional(v.string()),
  phone: phoneSchema,
  email: emailSchema,
  notes: v.optional(v.string()),
  createdAt: v.optional(v.date()),
});

export type Client = v.InferOutput<typeof clientSchema>;
