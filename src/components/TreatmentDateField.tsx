"use client";

import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import dayjs from "dayjs";
import { type Control, Controller } from "react-hook-form";
import type { Treatment } from "@/schemas";

/** Keep clearing and partial date edits in the form's validation state. */
export default function TreatmentDateField({
  control,
}: {
  control: Control<Treatment>;
}) {
  return (
    <Controller
      control={control}
      name="date"
      render={({ field, fieldState }) => (
        <DateTimePicker
          label="Date"
          value={field.value ? dayjs(field.value) : null}
          onChange={(value) => field.onChange(value ?? undefined)}
          slotProps={{
            field: { clearable: true },
            textField: {
              name: field.name,
              onBlur: field.onBlur,
              required: true,
              error: Boolean(fieldState.error),
              helperText: fieldState.error?.message,
            },
          }}
        />
      )}
    />
  );
}
