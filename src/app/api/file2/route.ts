// This unlinked upload experiment has no file records or domain references in the supplied backup.
const retired = () =>
  Response.json(
    { error: "UPLOADS_RETIRED" },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
export const GET = retired;
export const POST = retired;
