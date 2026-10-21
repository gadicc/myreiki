// Old offline queues are intentionally retired by operator decision.
const retired = () =>
  Response.json(
    {
      error: "LEGACY_CLIENT_RETIRED",
      message: "Reload MyReiki and sign in again.",
    },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
export const GET = retired;
export const POST = retired;
