import * as v from "valibot";
import { emailSchema, phoneSchema } from "./contact";

export const practiceSchema = v.object({
  _id: v.string(),
  userId: v.string(),
  name: v.string(),
  countryId: v.optional(
    v.union([v.literal(""), v.pipe(v.string(), v.length(2))]),
  ),
  phone: phoneSchema,
  email: emailSchema,
  website: v.optional(v.union([v.literal(""), v.pipe(v.string(), v.url())])),
  notes: v.optional(v.string()),
});

export type Practice = v.InferOutput<typeof practiceSchema>;
