import * as v from "valibot";

/** Blank inputs remain blank; international numbers use the stored +country format. */
export const phoneSchema = v.optional(
  v.pipe(
    v.string(),
    v.regex(
      /^(\+[1-9]\d{1,14})?$/,
      "Use an international phone number starting with +.",
    ),
  ),
);
export const emailSchema = v.optional(
  v.union(
    [
      v.literal(""),
      v.pipe(v.string(), v.email("Enter a valid email address.")),
    ],
    "Enter a valid email address.",
  ),
);
