// @vitest-environment jsdom

import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TreatmentDateField from "@/components/TreatmentDateField";
import { useForm } from "@/lib/forms";
import { type Treatment, treatmentSchema } from "@/schemas";

afterEach(cleanup);
function setup() {
  const submitted = vi.fn();
  function Form() {
    const { control, handleSubmit } = useForm<Treatment>({
      schema: treatmentSchema,
      defaultValues: {
        clientId: "client",
        practitionerId: "owner",
        practiceId: "practice",
        date: new Date("2026-10-21T09:00:00.000Z"),
        duration: 60,
        type: "reiki",
        reiki: { type: "regular" },
      },
    });
    return (
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <form onSubmit={handleSubmit(submitted)}>
          <TreatmentDateField control={control} />
          <button type="submit">Save</button>
        </form>
      </LocalizationProvider>
    );
  }
  render(<Form />);
  return submitted;
}

describe("treatment date picker", () => {
  it("submits the loaded date with the actual MUI control", async () => {
    const submitted = setup();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(submitted).toHaveBeenCalledOnce());
    expect(submitted.mock.calls[0][0].date.toISOString()).toBe(
      "2026-10-21T09:00:00.000Z",
    );
  });
  it("shows an error and prevents save after clearing", async () => {
    const submitted = setup();
    fireEvent.click(screen.getByRole("button", { name: /clear/i }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(
        screen
          .getByRole("group", { name: /date/i })
          .getAttribute("aria-invalid"),
      ).toBe("true"),
    );
    expect(submitted).not.toHaveBeenCalled();
  });
});
