// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react";
import * as v from "valibot";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useForm } from "@/lib/forms";
import { render, renderHook } from "./i18nRender";

afterEach(cleanup);
const schema = v.object({
  name: v.string(),
  duration: v.pipe(
    v.union([v.number(), v.string()]),
    v.transform(Number),
    v.number(),
    v.integer(),
    v.minValue(1),
  ),
  notes: v.optional(v.string()),
});

describe("Valibot React Hook Form adapter", () => {
  it("forwards registration options and changes transformed values by field name", async () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useForm<v.InferInput<typeof schema>>({
        schema,
        defaultValues: { name: "Aki", duration: "60" },
      }),
    );
    const duration = result.current.fr("duration", {
      onChange,
      onChangeTransform: true,
    });
    await act(async () => {
      await (duration.onChange as unknown as (value: string) => Promise<void>)(
        "90",
      );
    });
    expect(result.current.getValues("duration")).toBe("90");
    expect(onChange).toHaveBeenCalledOnce();
    expect(result.current.fr("notes").required).toBe(false);
    expect(result.current.fr("name").required).toBe(true);
    const submitted = vi.fn();
    await act(async () => {
      await result.current.handleSubmit(submitted)();
    });
    expect(submitted.mock.calls[0][0]).toEqual({ name: "Aki", duration: 90 });
  });

  it("submits rendered inputs through Valibot and displays validation errors", async () => {
    const submitted = vi.fn();
    function Form() {
      const { fr, handleSubmit } = useForm<
        v.InferInput<typeof schema>,
        unknown,
        v.InferOutput<typeof schema>
      >({ schema, defaultValues: { name: "Aki", duration: 60 } });
      const { error, helperText, ...duration } = fr("duration");
      return (
        <form onSubmit={handleSubmit(submitted)}>
          <input aria-label="Duration" {...duration} />
          {error && <p role="alert">{helperText}</p>}
          <button type="submit">Save</button>
        </form>
      );
    }
    render(<Form />);
    fireEvent.change(screen.getByLabelText("Duration"), {
      target: { value: "90" },
    });
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => expect(submitted).toHaveBeenCalledOnce());
    expect(submitted.mock.calls[0][0].duration).toBe(90);
    fireEvent.change(screen.getByLabelText("Duration"), {
      target: { value: "-1" },
    });
    await screen.findByRole("alert");
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => expect(submitted).toHaveBeenCalledOnce());
  });
});
