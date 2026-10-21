import * as v from "valibot";
import { describe, expect, it } from "vitest";
import { formFieldRequired } from "@/lib/formSchema";
import { clientSchema, treatmentSchema } from "@/schemas";

describe("form field metadata", () => {
  it("marks required and optional object inputs", () => {
    expect(formFieldRequired(clientSchema, "givenName", () => undefined)).toBe(
      true,
    );
    expect(formFieldRequired(clientSchema, "phone", () => undefined)).toBe(
      false,
    );
  });
  it("resolves the selected variant and rejects nonexistent fields", () => {
    expect(
      formFieldRequired(treatmentSchema, "reiki.type", () => "reiki"),
    ).toBe(true);
    expect(() =>
      formFieldRequired(treatmentSchema, "reiki.type", () => "generic"),
    ).toThrow("Form has no such field");
    expect(() =>
      formFieldRequired(treatmentSchema, "duration", () => "unknown"),
    ).toThrow();
  });
  it("retains optional ancestors when traversing arrays", () => {
    expect(
      formFieldRequired(treatmentSchema, "bodyPoints.front.0.x", () => "reiki"),
    ).toBe(false);
  });
  it("does not turn nullable into optional", () => {
    const schema = v.object({ name: v.nullable(v.string()) });
    expect(formFieldRequired(schema, "name", () => undefined)).toBe(true);
  });
});
