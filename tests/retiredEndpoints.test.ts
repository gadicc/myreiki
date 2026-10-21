import { expect, it } from "vitest";
import { POST as upload } from "@/app/api/file2/route";
import { GET, POST } from "@/app/api/gongoPoll/route";

it("fails retired clients and the unlinked upload experiment closed without touching Mongo", async () => {
  for (const handler of [GET, POST, upload]) {
    const response = handler();
    expect(response.status).toBe(410);
    expect(response.headers.get("cache-control")).toBe("no-store");
  }
});
