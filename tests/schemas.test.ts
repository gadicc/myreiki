import dayjs from "dayjs";
import * as v from "valibot";
import { describe, expect, it } from "vitest";
import { clientSchema, practiceSchema, treatmentSchema } from "@/schemas";

const practice = { _id: "practice", userId: "owner", name: "My practice" };
const client = { practiceId: "practice", givenName: "Aki" };
const treatment = {
  clientId: "client",
  practiceId: "practice",
  practitionerId: "owner",
  date: new Date("2026-10-21T09:00:00.000Z"),
  duration: 60,
  type: "reiki" as const,
  reiki: { type: "regular" as const },
};

// Assert product values rather than Mongo/Gongo persistence method calls.
describe("practice and client values", () => {
  it("preserves optional blank form fields", () => {
    expect(
      v.parse(practiceSchema, {
        ...practice,
        phone: "",
        email: "",
        website: "",
        countryId: "",
      }),
    ).toEqual({
      ...practice,
      phone: "",
      email: "",
      website: "",
      countryId: "",
    });
    expect(v.parse(clientSchema, { ...client, email: "", phone: "" })).toEqual({
      ...client,
      email: "",
      phone: "",
    });
  });
  it("preserves Unicode names and exact multiline notes", () => {
    const input = {
      ...client,
      givenName: "秋",
      familyName: "佐藤",
      notes: "\uFEFFFirst\r\nSecond 🌱\n",
    };
    expect(v.parse(clientSchema, input)).toEqual(input);
  });
  it.each(["+447700900123", "+819012345678", ""])(
    "accepts international phone %s",
    (phone) => {
      expect(v.safeParse(clientSchema, { ...client, phone }).success).toBe(
        true,
      );
    },
  );
  it.each(["07700900123", "+01234", "+44 7700", "abc"])(
    "rejects invalid phone %s",
    (phone) => {
      expect(v.safeParse(clientSchema, { ...client, phone }).success).toBe(
        false,
      );
    },
  );
  it("validates email, website, and country length", () => {
    expect(
      v.safeParse(clientSchema, { ...client, email: "wrong" }).success,
    ).toBe(false);
    expect(
      v.safeParse(practiceSchema, { ...practice, website: "wrong" }).success,
    ).toBe(false);
    expect(
      v.safeParse(practiceSchema, { ...practice, countryId: "GBR" }).success,
    ).toBe(false);
    expect(
      v.safeParse(practiceSchema, { ...practice, countryId: "JP" }).success,
    ).toBe(true);
  });
});

describe("treatment values", () => {
  it("preserves both supported modalities", () => {
    expect(v.parse(treatmentSchema, treatment)).toEqual(treatment);
    const { reiki, ...generic } = { ...treatment, type: "generic" as const };
    expect(v.parse(treatmentSchema, generic)).toEqual(generic);
  });
  it.each(["regular", "psychological", "self", "distance", "non-human"])(
    "supports Reiki subtype %s",
    (type) => {
      expect(
        v.safeParse(treatmentSchema, { ...treatment, reiki: { type } }).success,
      ).toBe(true);
    },
  );
  it("requires the selected modality's details", () => {
    expect(
      v.safeParse(treatmentSchema, { ...treatment, reiki: undefined }).success,
    ).toBe(false);
    expect(
      v.safeParse(treatmentSchema, { ...treatment, reiki: { type: "unknown" } })
        .success,
    ).toBe(false);
  });
  it("coerces numeric form duration without rounding", () => {
    expect(
      v.parse(treatmentSchema, { ...treatment, duration: "90" }).duration,
    ).toBe(90);
  });
  it.each(["", 0, -1, 1.5, "invalid", Infinity])(
    "rejects duration %s",
    (duration) => {
      expect(
        v.safeParse(treatmentSchema, { ...treatment, duration }).success,
      ).toBe(false);
    },
  );
  it("accepts the existing Dayjs picker value", () => {
    expect(
      v.safeParse(treatmentSchema, {
        ...treatment,
        date: dayjs(treatment.date),
      }).success,
    ).toBe(true);
  });
  it("preserves ordered front/back body points", () => {
    const point = {
      _id: "point",
      treatmentId: "treatment",
      x: 0,
      y: 1,
      size: 1,
      level: 5,
    };
    const bodyPoints = {
      front: [point, { ...point, _id: "point2", x: 1 }],
      back: [],
    };
    expect(
      v.parse(treatmentSchema, { ...treatment, bodyPoints }).bodyPoints,
    ).toEqual(bodyPoints);
    expect(
      v.safeParse(treatmentSchema, {
        ...treatment,
        bodyPoints: { front: [{ ...point, x: 1.01 }], back: [] },
      }).success,
    ).toBe(false);
  });
});
