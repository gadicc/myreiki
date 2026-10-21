"use client";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";

import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import dayjs from "dayjs";
import { type Control, Controller } from "react-hook-form";
import { displayError } from "@/lib/i18n/messages";
import type { Treatment } from "@/schemas";

/** Keep clearing and partial date edits in the form's validation state. */
export default function TreatmentDateField({
  control,
}: {
  control: Control<Treatment>;
}) {
  const { i18n } = useLingui();

  return (
    <Controller
      control={control}
      name="date"
      render={({ field, fieldState }) => (
        <DateTimePicker
          label={i18n._(msg`Date`)}
          value={field.value ? dayjs(field.value) : null}
          onChange={(value) => field.onChange(value ?? undefined)}
          slotProps={{
            field: { clearable: true },
            textField: {
              name: field.name,
              onBlur: field.onBlur,
              required: true,
              error: Boolean(fieldState.error),
              helperText: fieldState.error
                ? displayError(i18n, fieldState.error.message)
                : undefined,
            },
          }}
        />
      )}
    />
  );
}
