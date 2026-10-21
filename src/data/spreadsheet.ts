import * as v from "valibot";
import { treatmentSchema } from "@/schemas/treatment";

export interface SpreadsheetRow {
  date: Date;
  clientName: string;
  duration: number;
  reikiType: "regular" | "psychological" | "self" | "distance" | "non-human";
  notes: string;
}

/** Validate the entire paste before allocating or saving any client or treatment. */
export function parseSpreadsheet(input: string): SpreadsheetRow[] {
  return input
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line, index) => {
      const cells = line.split("\t");
      if (cells.length < 4 || cells.length > 5)
        throw new Error(
          `Row ${index + 1}: expected four or five tab-separated columns.`,
        );
      const [dateText, name, minutes, type, notes = ""] = cells;
      if (
        !/^\d{4}-\d{2}-\d{2}(?:T[\d:.]+(?:Z|[+-]\d{2}:\d{2}))?$/.test(
          dateText.trim(),
        )
      )
        throw new Error(
          `Row ${index + 1}: use YYYY-MM-DD or an ISO date and time with timezone.`,
        );
      const date = new Date(dateText.trim());
      const calendar = dateText.trim().slice(0, 10);
      if (
        !Number.isFinite(date.getTime()) ||
        new Date(`${calendar}T00:00:00Z`).toISOString().slice(0, 10) !==
          calendar
      )
        throw new Error(`Row ${index + 1}: invalid date.`);
      if (!name.trim() || !/^\d+$/.test(minutes.trim()))
        throw new Error(
          `Row ${index + 1}: client name and whole minutes are required.`,
        );
      const treatment = v.safeParse(treatmentSchema, {
        practiceId: "preview",
        clientId: "preview",
        practitionerId: "preview",
        date,
        duration: Number(minutes),
        type: "reiki",
        reiki: { type: type.trim() || "regular" },
        notes,
      });
      if (
        !treatment.success ||
        treatment.output.type !== "reiki" ||
        !Number.isSafeInteger(treatment.output.duration)
      )
        throw new Error(`Row ${index + 1}: invalid duration or Reiki type.`);
      return {
        date,
        clientName: name.trim(),
        duration: treatment.output.duration,
        reikiType: treatment.output.reiki.type,
        notes,
      };
    });
}
