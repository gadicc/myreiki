// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("@/components/body-front.svg", () => ({ default: () => <svg /> }));
vi.mock("@/components/body-back.svg", () => ({ default: () => <svg /> }));

import BodyPoints from "@/app/treatment/edit/[_id]/bodyPoints";
import { uuidV7 } from "@/lib/uuid";

afterEach(cleanup);
it("renders points arriving after load and emits edits against the current treatment", () => {
  const onChange = vi.fn(),
    treatmentId = uuidV7();
  const { rerender } = render(
    <BodyPoints
      name="bodyPoints"
      value={undefined}
      onChange={onChange}
      treatmentId={treatmentId}
    />,
  );
  const point = {
    _id: uuidV7(),
    treatmentId,
    x: 0.2,
    y: 0.3,
    size: 2,
    level: 1,
  };
  rerender(
    <BodyPoints
      name="bodyPoints"
      value={{ front: [point], back: [] }}
      onChange={onChange}
      treatmentId={treatmentId}
    />,
  );
  expect(screen.getByText("F1")).toBeTruthy();
  const clonedId = uuidV7(),
    clonedPoint = { ...point, _id: uuidV7(), treatmentId: clonedId };
  rerender(
    <BodyPoints
      name="bodyPoints"
      value={{ front: [clonedPoint], back: [] }}
      onChange={onChange}
      treatmentId={clonedId}
    />,
  );
  fireEvent.keyDown(
    screen.getByRole("button", { name: "Add back body point" }),
    { key: "Enter" },
  );
  const result = onChange.mock.calls[0][0];
  expect(result.front).toEqual([clonedPoint]);
  expect(result.back[0]).toMatchObject({
    treatmentId: clonedId,
    x: 0.5,
    y: 0.5,
  });
});
