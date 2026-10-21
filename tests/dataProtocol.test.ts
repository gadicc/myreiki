import { expect, it } from "vitest";
import { parseOperation } from "@/data/model";
import { uuidV7 } from "@/lib/uuid";

it("requires canonical point IDs, the current parent, and discrete body-point controls", () => {
  const id = uuidV7(),
    actor = uuidV7();
  const point = {
    _id: uuidV7(),
    treatmentId: id,
    x: 0.5,
    y: 0.5,
    size: 2,
    level: 1,
  };
  const operation = {
    protocol: 1,
    operationId: uuidV7(),
    actorId: actor,
    collection: "treatments",
    id,
    baseVersion: 0,
    kind: "save",
    record: {
      _id: id,
      practiceId: uuidV7(),
      clientId: uuidV7(),
      practitionerId: actor,
      date: new Date(),
      duration: 60,
      type: "reiki",
      reiki: { type: "regular" },
      bodyPoints: { front: [point], back: [] },
    },
  };
  expect(parseOperation(operation).record).toBeTruthy();
  for (const patch of [
    { _id: "legacy-point" },
    { treatmentId: uuidV7() },
    { level: 1.5 },
    { size: 0 },
    { x: 1.001 },
  ])
    expect(() =>
      parseOperation({
        ...operation,
        record: {
          ...operation.record,
          bodyPoints: { front: [{ ...point, ...patch }], back: [] },
        },
      }),
    ).toThrow();
});
